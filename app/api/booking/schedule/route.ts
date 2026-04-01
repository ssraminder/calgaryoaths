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

    // Fetch commissioner for fee + commission rate
    const { data: commissioner } = await supabase
      .from('co_commissioners')
      .select('booking_fee_cents, commission_rate, is_partner')
      .eq('id', booking.commissioner_id)
      .single();

    const bookingFee = commissioner?.booking_fee_cents ?? (await getBookingFee(booking.commissioner_id));
    const commissionRate = commissioner?.is_partner ? (commissioner.commission_rate ?? 20) : 0;
    const platformFeeCents = Math.round(bookingFee * (commissionRate / 100));
    const vendorPayoutCents = bookingFee - platformFeeCents;

    // Save appointment datetime + commission info
    await supabase
      .from('co_bookings')
      .update({
        appointment_datetime: appointmentDatetime,
        status: 'pending_payment',
        commission_rate: commissionRate,
        platform_fee_cents: platformFeeCents,
        vendor_payout_cents: vendorPayoutCents,
      })
      .eq('id', bookingId);
    const feeLabel = `$${bookingFee / 100}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const apptDate = new Date(appointmentDatetime).toLocaleString('en-CA', {
      timeZone: 'America/Edmonton',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: bookingFee,
            product_data: {
              name: `Booking deposit — ${booking.service_name}`,
              description: `Appointment: ${apptDate}. ${feeLabel} deposit secures your slot. Final payment collected at your appointment.`,
            },
          },
          quantity: 1,
        },
      ],
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
