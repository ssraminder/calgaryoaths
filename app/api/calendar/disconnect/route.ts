// Disconnect a calendar connection and clean up synced blocks.
import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { clearSyncedBlocks } from '@/lib/calendar-sync';

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

  // Remove this connection's synced busy blocks (other connected calendars keep theirs)
  await clearSyncedBlocks({ id: conn.id, commissioner_id: vendor.commissionerId });

  // Delete the connection
  await supabaseAdmin.from('co_calendar_connections').delete().eq('id', connectionId);

  return NextResponse.json({ success: true });
}
