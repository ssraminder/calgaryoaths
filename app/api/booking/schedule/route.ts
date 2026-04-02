import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBookingFee } from '@/lib/data/booking';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const { bookingId, appointmentDatetime } = await req.json();

    if (!bookingId || !appointmentDatetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: booking, error } = await supabase
      .from('co_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check slot is still available (race condition guard)
    const { count } = await supabase
      .from('co_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('commissioner_id', booking.commissioner_id)
      .eq('appointment_datetime', appointmentDatetime)
      .in('status', ['pending_payment', 'paid', 'confirmed']);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'This slot was just taken. Please choose another time.' }, { status: 409 });
    }

    // If payment was already transferred from a rebooked booking, skip Stripe
    if (booking.status === 'paid' && booking.transferred_from_booking_id) {
      await supabase
        .from('co_bookings')
        .update({
          appointment_datetime: appointmentDatetime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      return NextResponse.json({ paymentTransferred: true });
    }

    // Fetch commissioner for commission rate + mode + travel fee
    const { data: commissioner } = await supabase
      .from('co_commissioners')
      .select('booking_fee_cents, commission_rate, is_partner, commission_mode, mobile_travel_fee_cents, gst_registered')
      .eq('id', booking.commissioner_id)
      .single();

    // Booking fee = first document rate (vendor rate → service price only)
    const { data: vendorRate } = await supabase
      .from('co_vendor_rates')
      .select('first_page_cents')
      .eq('commissioner_id', booking.commissioner_id)
      .eq('service_slug', booking.service_slug)
      .single();

    let baseServiceFee = vendorRate?.first_page_cents ?? null;
    if (!baseServiceFee) {
      const { data: service } = await supabase
        .from('co_services')
        .select('price')
        .eq('slug', booking.service_slug)
        .single();
      baseServiceFee = service?.price ?? null;
    }

    // If no price found, this service requires manual review / quote
    if (!baseServiceFee) {
      return NextResponse.json(
        { error: 'This service requires a quote. Please contact us at (587) 600-0746.' },
        { status: 400 }
      );
    }

    // Commission calculation
    const commissionRate = commissioner?.is_partner ? (commissioner.commission_rate ?? 20) : 0;
    const commissionMode = commissioner?.commission_mode || 'absorb';

    // Customer-facing service fee (includes commission markup if pass_to_customer)
    const customerServiceFee = commissionMode === 'pass_to_customer'
      ? Math.round(baseServiceFee * (1 + commissionRate / 100))
      : baseServiceFee;

    // Platform fee is always commission on the base rate
    const platformFeeCents = Math.round(baseServiceFee * (commissionRate / 100));
    const vendorPayoutCents = baseServiceFee - (commissionMode === 'absorb' ? platformFeeCents : 0);

    // Vendor GST: if vendor is GST-registered, add 5% GST to their payout
    const vendorGstCents = commissioner?.gst_registered
      ? Math.round(vendorPayoutCents * 0.05)
      : 0;
    const vendorTotalPayoutCents = vendorPayoutCents + vendorGstCents;

    // Convenience fee + tax
    const { data: settingsData } = await supabase
      .from('co_settings')
      .select('key, value')
      .in('key', ['convenience_fee_cents', 'default_province']);
    const settingsMap = Object.fromEntries((settingsData ?? []).map((r) => [r.key, r.value]));
    const convenienceFeeCents = parseInt(settingsMap.convenience_fee_cents || '499', 10);
    const province = settingsMap.default_province || 'AB';

    const { data: taxData } = await supabase
      .from('co_tax_rates')
      .select('total_rate')
      .eq('province_code', province)
      .single();
    const taxRate = taxData?.total_rate ?? 0.05;

    // Travel fee for mobile bookings (pre-calculated and stored on booking)
    const travelFeeCents = booking.delivery_mode === 'mobile' ? (booking.travel_fee_cents || 0) : 0;

    const subtotal = customerServiceFee + travelFeeCents + convenienceFeeCents;
    const taxCents = Math.round(subtotal * taxRate);
    const totalChargedCents = subtotal + taxCents;

    // Save appointment datetime + all fee info
    await supabase
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
      })
      .eq('id', bookingId);

    const bookingFee = totalChargedCents;
    const feeLabel = `$${bookingFee / 100}`;
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
          product_data: { name: 'Convenience fee' },
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
      success_url: `${siteUrl}/booking/success?appointment=confirmed`,
      cancel_url: `${siteUrl}/?booking_cancelled=1`,
    });

    await supabase
      .from('co_bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', bookingId);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Schedule error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
