import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const { data: order, error: findErr } = await supabaseAdmin
    .from('co_orders')
    .select('order_number, invoice_number, invoice_generated_at')
    .eq('id', id)
    .single();
  if (findErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const invoice_number = order.invoice_number || order.order_number;
  const now = new Date().toISOString();

  const { error: updErr } = await supabaseAdmin
    .from('co_orders')
    .update({
      invoice_number,
      invoice_generated_at: now,
    })
    .eq('id', id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ invoice_number, invoice_generated_at: now });
}
