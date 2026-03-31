import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { BOOKING_FEES } from '@/lib/data/booking';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

const DEFAULT_BOOKING_FEE = 4000; // $40 fallback

export async function POST(req: NextRequest) {
  try {
    const { bookingId, calendlyEventUri } = await req.json();

    const { data: booking, error } = await supabase
      .from('co_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Save Calendly event URI
    await supabase
      .from('co_bookings')
      .update({ calendly_event_uri: calendlyEventUri, status: 'pending_payment' })
      .eq('id', bookingId);

    const bookingFee = BOOKING_FEES[booking.commissioner_id] ?? DEFAULT_BOOKING_FEE;
    const feeLabel = `$${bookingFee / 100}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
              description: `${feeLabel} deposit to secure your appointment. Final payment collected at your appointment based on the number of documents.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        serviceSlug: booking.service_slug,
      },
      success_url: `${siteUrl}/booking/success?appointment=confirmed`,
      cancel_url: `${siteUrl}/?booking_cancelled=1`,
    });

    await supabase
      .from('co_bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', bookingId);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Charge error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
