// Disconnect a calendar connection and clean up synced blocks.
import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connectionId } = await req.json();
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

  // Remove calendar-synced blocks from co_custom_times
  await supabaseAdmin
    .from('co_custom_times')
    .delete()
    .eq('commissioner_id', vendor.commissionerId)
    .eq('source', 'calendar');

  // Delete the connection
  await supabaseAdmin.from('co_calendar_connections').delete().eq('id', connectionId);

  return NextResponse.json({ success: true });
}
