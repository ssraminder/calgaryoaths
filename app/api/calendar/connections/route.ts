// List calendar connections for the authenticated vendor.
import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('id, provider, calendar_id, display_name, sync_enabled, push_bookings, pull_busy_times, last_synced_at, created_at')
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
    .select('id, commissioner_id')
    .eq('id', connectionId)
    .single();

  if (!conn || conn.commissioner_id !== vendor.commissionerId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof sync_enabled === 'boolean') updates.sync_enabled = sync_enabled;
  if (typeof push_bookings === 'boolean') updates.push_bookings = push_bookings;
  if (typeof pull_busy_times === 'boolean') updates.pull_busy_times = pull_busy_times;

  await supabaseAdmin.from('co_calendar_connections').update(updates).eq('id', connectionId);

  return NextResponse.json({ success: true });
}
