// Calendar sync API — pulls busy times from connected calendars and stores them
// as 'block' entries in co_custom_times with source='calendar'.
// Can be called manually by vendor or on a cron schedule.
// Also handles pushing bookings to calendars when called with pushBookingId.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  CalendarConnection,
  ensureFreshToken,
  getBusyTimes,
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

// POST: Trigger sync for authenticated vendor or via cron secret
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get('secret');
  let commissionerId: string | null = null;

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
  commissionerId = vendor.commissionerId;

  const { data: connections } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .eq('sync_enabled', true)
    .eq('pull_busy_times', true);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No active calendar connections with pull enabled' });
  }

  let totalBlocks = 0;
  let errors = 0;
  for (const conn of connections as CalendarConnection[]) {
    try {
      totalBlocks += await syncBusyTimes(conn);
    } catch (err) {
      console.error(`Sync error for ${conn.provider}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ synced: connections.length, totalBlocks, errors });
}
