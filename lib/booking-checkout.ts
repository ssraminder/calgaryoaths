import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export type CheckoutResult =
  | { ok: true; checkoutUrl: string | null; totalChargedCents: number; paymentTransferred?: false }
  | { ok: true; paymentTransferred: true }
  | { ok: false; status: number; error: string };

type Options = {
  successUrl?: string;
  cancelUrl?: string;
};

export async function createCheckoutSessionForBooking(
  bookingId: string,
  appointmentDatetime: string,
  opts: Options = {}
): Promise<CheckoutResult> {
  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return { ok: false, status: 404, error: 'Booking not found' };
  }

  // Slot availability guard — excludes current booking and stale pending_payment (>10 min).
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('co_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('commissioner_id', booking.commissioner_id)
    .eq('appointment_datetime', appointmentDatetime)
    .neq('id', bookingId)
    .or(`status.in.(paid,confirmed),and(status.eq.pending_payment,updated_at.gt.${staleThreshold})`);

  if ((count ?? 0) > 0) {
    return { ok: false, status: 409, error: 'This slot was just taken. Please choose another time.' };
  }

  if (booking.status === 'paid' && booking.transferred_from_booking_id) {
    await supabaseAdmin
      .from('co_bookings')
      .update({
        appointment_datetime: appointmentDatetime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    return { ok: true, paymentTransferred: true };
  }

  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('booking_fee_cents, commission_rate, is_partner, commission_mode, mobile_travel_fee_cents, gst_registered')
    .eq('id', booking.commissioner_id)
    .single();

  const { data: vendorRate } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('first_page_cents')
    .eq('commissioner_id', booking.commissioner_id)
    .eq('service_slug', booking.service_slug)
    .single();

  let baseServiceFee: number | null = vendorRate?.first_page_cents ?? null;
  if (!baseServiceFee) {
    const { data: service } = await supabaseAdmin
      .from('co_services')
      .select('price')
      .eq('slug', booking.service_slug)
      .single();
    if (service?.price) {
      baseServiceFee = Math.round((service.price * 0.8) / 500) * 500;
    }
  }

  if (!baseServiceFee) {
    return {
      ok: false,
      status: 400,
      error: 'This service requires a quote. Please contact us at (587) 600-0746.',
    };
  }

  const commissionRate = commissioner?.is_partner ? (commissioner.commission_rate ?? 20) : 0;
  const commissionMode = commissioner?.commission_mode || 'absorb';

  const customerServiceFee = commissionMode === 'pass_to_customer'
    ? Math.round(baseServiceFee * (1 + commissionRate / 100))
    : baseServiceFee;

  const platformFeeCents = Math.round(baseServiceFee * (commissionRate / 100));
  const vendorPayoutCents = baseServiceFee - (commissionMode === 'absorb' ? platformFeeCents : 0);

  const vendorGstCents = commissioner?.gst_registered
    ? Math.round(vendorPayoutCents * 0.05)
    : 0;
  const vendorTotalPayoutCents = vendorPayoutCents + vendorGstCents;

  const { data: settingsData } = await supabaseAdmin
    .from('co_settings')
    .select('key, value')
    .in('key', ['convenience_fee_cents', 'default_province']);
  const settingsMap = Object.fromEntries((settingsData ?? []).map((r) => [r.key, r.value]));
  const convenienceFeeCents = parseInt(settingsMap.convenience_fee_cents || '499', 10);
  const province = settingsMap.default_province || 'AB';

  const { data: taxData } = await supabaseAdmin
    .from('co_tax_rates')
    .select('total_rate')
    .eq('province_code', province)
    .single();
  const taxRate = taxData?.total_rate ?? 0.05;

  const travelFeeCents = booking.delivery_mode === 'mobile' ? (booking.travel_fee_cents || 0) : 0;

  const subtotal = customerServiceFee + travelFeeCents + convenienceFeeCents;
  const taxCents = Math.round(subtotal * taxRate);
  const totalChargedCents = subtotal + taxCents;

  await supabaseAdmin
    .from('co_bookings')
    .update({
      appointment_datetime: appointmentDatetime,
      status: 'pending_payment',
      commission_rate: commissionRate,
      commission_mode: commissionMode,
      platform_fee_cents: platformFeeCents,
      vendor_payout_cents: vendorPayoutCents,
      vendor_gst_cents: vendorGstCents,
      vendor_total_payout_cents: vendorTotalPayoutCents,
      travel_fee_cents: travelFeeCents,
      convenience_fee_cents: convenienceFeeCents,
      tax_rate: taxRate,
      tax_cents: taxCents,
      total_charged_cents: totalChargedCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const apptDate = new Date(appointmentDatetime).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const taxLabel = `Tax (${(taxRate * 100).toFixed(0)}%)`;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'cad',
        unit_amount: customerServiceFee,
        product_data: {
          name: `${booking.service_name} — First document`,
          description: `Appointment: ${apptDate}. Additional documents charged at appointment.`,
        },
      },
      quantity: 1,
    },
  ];

  if (travelFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'cad',
        unit_amount: travelFeeCents,
        product_data: { name: 'Mobile service travel fee' },
      },
      quantity: 1,
    });
  }

  lineItems.push(
    {
      price_data: {
        currency: 'cad',
        unit_amount: convenienceFeeCents,
        product_data: { name: 'Convenience fee (platform)' },
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: 'cad',
        unit_amount: taxCents,
        product_data: { name: taxLabel },
      },
      quantity: 1,
    },
  );

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: booking.email,
    line_items: lineItems,
    metadata: { bookingId, serviceSlug: booking.service_slug },
    success_url: opts.successUrl || `${siteUrl}/booking/success?appointment=confirmed`,
    cancel_url: opts.cancelUrl || `${siteUrl}/?booking_cancelled=1`,
  });

  await supabaseAdmin
    .from('co_bookings')
    .update({ stripe_session_id: session.id })
    .eq('id', bookingId);

  return { ok: true, checkoutUrl: session.url, totalChargedCents };
}
