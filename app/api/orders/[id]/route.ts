import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { staffSectionSchema, orderItemSchema } from '@/lib/orders/schema';
import { computeTotals, lineTotalCents } from '@/lib/orders/pricing';
import { diffFields, logOrderEvent } from '@/lib/orders/audit';
import { z } from 'zod';

const customerEditSchema = z.object({
  customer_name: z.string().min(1).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().min(1).optional(),
  customer_address_street: z.string().nullable().optional(),
  customer_address_unit: z.string().nullable().optional(),
  customer_address_city: z.string().nullable().optional(),
  customer_address_province: z.string().nullable().optional(),
  customer_address_postal: z.string().nullable().optional(),
  customer_address_country: z.string().nullable().optional(),
  customer_notes: z.string().nullable().optional(),
});

const patchSchema = staffSectionSchema.partial().merge(customerEditSchema).extend({
  status: z.enum(['draft', 'awaiting_customer', 'customer_completed', 'awaiting_payment', 'paid', 'completed', 'cancelled']).optional(),
  cancelled_reason: z.string().nullable().optional(),
  discount_cents: z.number().int().min(0).nullable().optional(),
  discount_reason: z.string().nullable().optional(),
});

// Whitelist of order columns we audit-log diffs for.
const AUDITED_FIELDS = [
  'status', 'order_date', 'expedited', 'estimated_turnaround_days', 'tax_province_code',
  'destination_country', 'authentication_type', 'notarization_required', 'translation_required',
  'translation_language', 'delivery_method',
  'service_subtypes', 'service_role', 'performed_by_commissioner_id',
  'delivery_mode', 'mobile_address', 'travel_fee_cents',
  'discount_cents', 'discount_reason',
  'cancelled_reason',
  'customer_name', 'customer_email', 'customer_phone',
  'customer_address_street', 'customer_address_unit', 'customer_address_city',
  'customer_address_province', 'customer_address_postal', 'customer_address_country',
  'customer_notes',
  'tracking_to_gov', 'tracking_from_gov',
  'notes_internal',
];

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

  // Snapshot the order before updating so we can diff for the audit log.
  const { data: beforeOrder } = await supabaseAdmin
    .from('co_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (!beforeOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

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

  // Audit log
  const fieldChanges = diffFields(beforeOrder, updateFields, AUDITED_FIELDS);
  const isCancel = orderFields.status === 'cancelled' && beforeOrder.status !== 'cancelled';
  const isComplete = orderFields.status === 'completed' && beforeOrder.status !== 'completed';

  if (items) {
    await logOrderEvent({
      orderId: id,
      actor: { id: staff.id, fullName: staff.fullName, email: staff.email, role: staff.role },
      eventType: 'order.items.update',
      summary: `Updated line items (${items.length} item${items.length === 1 ? '' : 's'})`,
      changes: { items_count: items.length, ...(fieldChanges.discount_cents ? { discount_cents: fieldChanges.discount_cents } : {}) },
    });
  }

  if (isCancel) {
    await logOrderEvent({
      orderId: id,
      actor: { id: staff.id, fullName: staff.fullName, email: staff.email, role: staff.role },
      eventType: 'order.cancel',
      summary: orderFields.cancelled_reason
        ? `Cancelled order: ${orderFields.cancelled_reason}`
        : 'Cancelled order',
      changes: { cancelled_reason: orderFields.cancelled_reason ?? null },
    });
  } else if (isComplete) {
    await logOrderEvent({
      orderId: id,
      actor: { id: staff.id, fullName: staff.fullName, email: staff.email, role: staff.role },
      eventType: 'order.complete',
      summary: 'Marked order as completed',
    });
  } else if (Object.keys(fieldChanges).length > 0) {
    const summary = `Updated ${Object.keys(fieldChanges).join(', ')}`;
    await logOrderEvent({
      orderId: id,
      actor: { id: staff.id, fullName: staff.fullName, email: staff.email, role: staff.role },
      eventType: 'order.update',
      summary,
      changes: fieldChanges,
    });
  }

  return NextResponse.json({ ok: true });
}
