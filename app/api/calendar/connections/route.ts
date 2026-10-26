// List calendar connections for the authenticated vendor, and update their sync toggles.
import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { CalendarConnection } from '@/lib/calendar-providers';
import {
  backfillBookingCalendarEvents,
  clearSyncedBlocks,
  syncBusyTimesForConnection,
} from '@/lib/calendar-sync';
import { recordConnectionError } from '@/lib/calendar-connections';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Never return tokens to the browser
  const base = 'id, provider, calendar_id, display_name, sync_enabled, push_bookings, pull_busy_times, last_synced_at, created_at';
  const withHealth = await supabaseAdmin
    .from('co_calendar_connections')
    .select(`${base}, status, last_error, last_error_at`)
    .eq('commissioner_id', vendor.commissionerId)
    .order('created_at', { ascending: true });
  if (!withHealth.error) return NextResponse.json({ connections: withHealth.data ?? [] });

  // Health columns come from sql/010; don't report "not connected" if it hasn't been applied yet
  console.error('[calendar] connections query failed, retrying without health columns:', withHealth.error.message);
  const { data } = await supabaseAdmin
    .from('co_calendar_connections')
    .select(base)
    .eq('commissioner_id', vendor.commissionerId)
    .order('created_at', { ascending: true });
  return NextResponse.json({ connections: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connectionId, sync_enabled, push_bookings, pull_busy_times } = await req.json();
  if (!connectionId) return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });

  // Verify ownership
  const { data: conn } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (!conn || conn.commissioner_id !== vendor.commissionerId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof sync_enabled === 'boolean') updates.sync_enabled = sync_enabled;
  if (typeof push_bookings === 'boolean') updates.push_bookings = push_bookings;
  if (typeof pull_busy_times === 'boolean') updates.pull_busy_times = pull_busy_times;

  const { error } = await supabaseAdmin.from('co_calendar_connections').update(updates).eq('id', connectionId);
  if (error) return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });

  // Apply the toggle right away instead of waiting for the next scheduled sync
  const updated = { ...conn, ...updates } as CalendarConnection;
  const pulling = updated.sync_enabled && updated.pull_busy_times;
  const pushing = updated.sync_enabled && updated.push_bookings;
  let warning: string | undefined;

  if (!pulling) {
    await clearSyncedBlocks(updated);
  } else if (pull_busy_times === true || sync_enabled === true) {
    try {
      await syncBusyTimesForConnection(updated);
    } catch (err) {
      await recordConnectionError(updated, err, 'calendar sync');
      warning = 'Saved, but we could not read your calendar right now.';
    }
  }
  if (pushing && (push_bookings === true || sync_enabled === true)) {
    await backfillBookingCalendarEvents({ commissionerId: vendor.commissionerId });
  }

  return NextResponse.json({ success: true, warning });
}
