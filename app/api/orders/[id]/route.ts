import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { staffSectionSchema, orderItemSchema } from '@/lib/orders/schema';
import { computeTotals, lineTotalCents } from '@/lib/orders/pricing';
import { z } from 'zod';

const patchSchema = staffSectionSchema.partial().extend({
  status: z.enum(['draft', 'awaiting_customer', 'customer_completed', 'awaiting_payment', 'paid', 'completed', 'cancelled']).optional(),
  cancelled_reason: z.string().nullable().optional(),
  discount_cents: z.number().int().min(0).nullable().optional(),
  discount_reason: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const [orderRes, itemsRes, photosRes] = await Promise.all([
    supabaseAdmin.from('co_orders').select('*').eq('id', id).single(),
    supabaseAdmin.from('co_order_items').select('*').eq('order_id', id).order('position', { ascending: true }),
    supabaseAdmin.from('co_order_id_photos').select('*').eq('order_id', id).order('position', { ascending: true }),
  ]);

  if (orderRes.error || !orderRes.data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  return NextResponse.json({ order: orderRes.data, items: itemsRes.data || [], idPhotos: photosRes.data || [] });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = ctx.params;
  const { items, ...orderFields } = parsed.data;

  const updateFields: Record<string, unknown> = { ...orderFields };
  if (orderFields.status === 'cancelled') {
    updateFields.cancelled_at = new Date().toISOString();
  }
  if (orderFields.status === 'completed') {
    updateFields.completed_at = new Date().toISOString();
  }

  if (items) {
    const itemsParsed = z.array(orderItemSchema).safeParse(items);
    if (!itemsParsed.success) {
      return NextResponse.json({ error: 'Invalid items', issues: itemsParsed.error.issues }, { status: 400 });
    }
    await supabaseAdmin.from('co_order_items').delete().eq('order_id', id);
    if (itemsParsed.data.length > 0) {
      const rows = itemsParsed.data.map((it, idx) => ({
        order_id: id,
        position: it.position ?? idx,
        item_type: it.item_type ?? null,
        description: it.description,
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        gov_fee_cents: it.gov_fee_cents ?? 0,
        notes: it.notes ?? null,
        line_total_cents: lineTotalCents({
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          gov_fee_cents: it.gov_fee_cents ?? 0,
        }),
      }));
      const { error: insErr } = await supabaseAdmin.from('co_order_items').insert(rows);
      if (insErr) {
        console.error('Items insert error', insErr);
        return NextResponse.json({ error: 'Failed to save items' }, { status: 500 });
      }
    }

    const totals = computeTotals({
      items: itemsParsed.data.map((it) => ({
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        gov_fee_cents: it.gov_fee_cents ?? 0,
      })),
      travelFeeCents: orderFields.travel_fee_cents ?? null,
      discountCents: orderFields.discount_cents ?? null,
    });
    updateFields.subtotal_cents = totals.subtotalCents;
    updateFields.tax_cents = totals.taxCents;
    updateFields.total_cents = totals.totalCents;
  }

  if (Object.keys(updateFields).length > 0) {
    const { error: updErr } = await supabaseAdmin
      .from('co_orders')
      .update(updateFields)
      .eq('id', id);
    if (updErr) {
      console.error('Order update error', updErr);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
