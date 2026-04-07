// Calendar sync API — pulls busy times from connected calendars and stores them
// as 'block' entries in co_custom_times with source='calendar'.
// Can be called manually by vendor or on a cron schedule.
// When called with ?push=true, also pushes upcoming confirmed bookings to calendars.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  CalendarConnection,
  ensureFreshToken,
  getBusyTimes,
  createCalendarEvent,
} from '@/lib/calendar-providers';

const SYNC_DAYS_AHEAD = 14;

function calgaryDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
}

function calgaryTimeStr(date: Date): string {
  return date.toLocaleTimeString('en-CA', {
    timeZone: 'America/Edmonton',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Sync busy times for a single calendar connection */
async function syncBusyTimes(conn: CalendarConnection): Promise<number> {
  // Refresh token if needed
  const freshTokens = await ensureFreshToken(conn);
  if (freshTokens) {
    await supabaseAdmin
      .from('co_calendar_connections')
      .update({
        access_token: freshTokens.access_token,
        refresh_token: freshTokens.refresh_token,
        token_expires_at: freshTokens.token_expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id);
    conn.access_token = freshTokens.access_token;
  }

  const now = new Date();
  const future = new Date(now.getTime() + SYNC_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = future.toISOString();

  const busyPeriods = await getBusyTimes(conn, timeMin, timeMax);

  // Clear existing calendar-synced blocks for this commissioner
  await supabaseAdmin
    .from('co_custom_times')
    .delete()
    .eq('commissioner_id', conn.commissioner_id)
    .eq('source', 'calendar')
    .gte('custom_date', calgaryDateStr(now));

  // Insert new blocks
  const rows = busyPeriods.map((period) => {
    const startDt = new Date(period.start);
    const endDt = new Date(period.end);
    return {
      commissioner_id: conn.commissioner_id,
      custom_date: calgaryDateStr(startDt),
      start_time: calgaryTimeStr(startDt),
      end_time: calgaryTimeStr(endDt),
      mode: 'block' as const,
      source: 'calendar' as const,
      reason: `${conn.provider} calendar`,
      external_event_id: period.eventId || null,
    };
  });

  if (rows.length > 0) {
    await supabaseAdmin.from('co_custom_times').upsert(rows, {
      onConflict: 'commissioner_id,custom_date,start_time,end_time,mode',
    });
  }

  // Update last_synced_at
  await supabaseAdmin
    .from('co_calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', conn.id);

  return rows.length;
}

/** Push upcoming confirmed/paid bookings to all push-enabled calendars for a commissioner */
async function pushUpcomingBookings(commissionerId: string): Promise<number> {
  const { data: connections } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .eq('sync_enabled', true)
    .eq('push_bookings', true);

  if (!connections || connections.length === 0) return 0;

  const { data: bookings } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .in('status', ['confirmed', 'paid'])
    .gte('appointment_datetime', new Date().toISOString())
    .order('appointment_datetime', { ascending: true });

  if (!bookings || bookings.length === 0) return 0;

  let pushed = 0;
  for (const conn of connections as CalendarConnection[]) {
    try {
      const freshTokens = await ensureFreshToken(conn);
      if (freshTokens) {
        await supabaseAdmin
          .from('co_calendar_connections')
          .update({
            access_token: freshTokens.access_token,
            refresh_token: freshTokens.refresh_token,
            token_expires_at: freshTokens.token_expires_at,
          })
          .eq('id', conn.id);
        conn.access_token = freshTokens.access_token;
      }

      for (const booking of bookings) {
        try {
          const isMobile = booking.delivery_mode === 'mobile';
          const apptStart = new Date(booking.appointment_datetime);
          const apptEnd = new Date(apptStart.getTime() + 30 * 60 * 1000);
          await createCalendarEvent(conn, {
            title: `${booking.service_name} — ${booking.name}`,
            description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}${booking.notes ? `\nNotes: ${booking.notes}` : ''}`,
            location: isMobile
              ? booking.customer_address || 'Mobile service'
              : 'Calgary, AB',
            startTime: apptStart.toISOString(),
            endTime: apptEnd.toISOString(),
          });
          pushed++;
        } catch (err) {
          console.error(`Failed to push booking ${booking.id} to ${conn.provider}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to push bookings to ${conn.provider}:`, err);
    }
  }
  return pushed;
}

// POST: Trigger sync for authenticated vendor or via cron secret
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get('secret');
  const shouldPush = searchParams.get('push') === 'true';

  // Cron mode: sync all connections
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    const { data: connections } = await supabaseAdmin
      .from('co_calendar_connections')
      .select('*')
      .eq('sync_enabled', true)
      .eq('pull_busy_times', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let totalBlocks = 0;
    let errors = 0;
    for (const conn of connections as CalendarConnection[]) {
      try {
        totalBlocks += await syncBusyTimes(conn);
      } catch (err) {
        console.error(`Sync error for ${conn.commissioner_id}/${conn.provider}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ synced: connections.length, totalBlocks, errors });
  }

  // Vendor mode: sync their connections only
  const { verifyVendor } = await import('@/lib/vendor-auth');
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const commissionerId = vendor.commissionerId;

  const { data: connections } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .eq('sync_enabled', true)
    .eq('pull_busy_times', true);

  let totalBlocks = 0;
  let errors = 0;
  for (const conn of (connections || []) as CalendarConnection[]) {
    try {
      totalBlocks += await syncBusyTimes(conn);
    } catch (err) {
      console.error(`Sync error for ${conn.provider}:`, err);
      errors++;
    }
  }

  // Push upcoming bookings to calendars if requested
  let pushedBookings = 0;
  if (shouldPush) {
    try {
      pushedBookings = await pushUpcomingBookings(commissionerId);
    } catch (err) {
      console.error('Push bookings error:', err);
      errors++;
    }
  }

  return NextResponse.json({
    synced: (connections || []).length,
    totalBlocks,
    pushedBookings,
    errors,
  });
}
