import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const { data, error } = await supabaseAdmin
    .from('co_order_events')
    .select('id, actor_id, actor_name, actor_role, event_type, summary, changes_json, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Order events fetch error', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
  return NextResponse.json({ events: data || [] });
}
