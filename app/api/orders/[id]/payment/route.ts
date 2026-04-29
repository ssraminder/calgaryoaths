import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { paymentSchema } from '@/lib/orders/schema';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = ctx.params;
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('co_orders')
    .update({
      payment_method: parsed.data.payment_method,
      payment_reference: parsed.data.payment_reference ?? null,
      amount_paid_cents: parsed.data.amount_paid_cents,
      paid_at: now,
      paid_recorded_by: staff.id,
      status: 'paid',
    })
    .eq('id', id);

  if (error) {
    console.error('Payment record error', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, paid_at: now });
}
