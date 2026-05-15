import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('co_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!order.terms_version_id) {
    return NextResponse.json({ error: 'Order has no accepted terms' }, { status: 404 });
  }

  const { data: terms, error: termsErr } = await supabaseAdmin
    .from('co_terms_versions')
    .select('id, form_type, version, content_md, effective_from')
    .eq('id', order.terms_version_id)
    .single();

  if (termsErr || !terms) {
    return NextResponse.json({ error: 'Terms version not found' }, { status: 404 });
  }

  return NextResponse.json({ order, terms });
}
