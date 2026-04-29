import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateHandoff } from '@/lib/orders/handoff-token';

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  const { token } = ctx.params;

  const { data: order, error } = await supabaseAdmin
    .from('co_orders')
    .select(`
      id, order_number, order_type, status,
      order_date, expedited, estimated_turnaround_days,
      destination_country, authentication_type, notarization_required, translation_required, translation_language, delivery_method,
      service_subtypes, service_role, performed_by_commissioner_id, delivery_mode, mobile_address, travel_fee_cents,
      subtotal_cents, tax_cents, total_cents,
      handoff_token, handoff_token_expires_at, handoff_used_at,
      customer_name, customer_email, customer_phone, customer_dob,
      customer_address_street, customer_address_unit, customer_address_city, customer_address_province, customer_address_postal, customer_address_country,
      customer_notes, terms_accepted_at, signed_at
    `)
    .eq('handoff_token', token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const validity = validateHandoff(order);
  if (!validity.valid) {
    return NextResponse.json({ error: validity.reason || 'Invalid' }, { status: 410 });
  }

  const { data: items } = await supabaseAdmin
    .from('co_order_items')
    .select('id, position, description, quantity, unit_price_cents, gov_fee_cents, line_total_cents')
    .eq('order_id', order.id)
    .order('position', { ascending: true });

  const { data: terms } = await supabaseAdmin
    .from('co_terms_versions')
    .select('id, form_type, version, content_md')
    .eq('form_type', order.order_type)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ order, items: items || [], terms });
}
