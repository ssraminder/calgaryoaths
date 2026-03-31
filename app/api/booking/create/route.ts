import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { bookingServices } from '@/lib/data/booking';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceSlug, commissionerId, name, email, phone, notes, numDocuments } = body;

    const service = bookingServices.find((s) => s.slug === serviceSlug);
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Save booking to Supabase
    const { data: booking, error: dbError } = await supabase
      .from('co_bookings')
      .insert({
        service_slug: serviceSlug,
        service_name: service.name,
        commissioner_id: commissionerId || null,
        name,
        email,
        phone,
        notes: notes || null,
        num_documents: numDocuments || 1,
        requires_review: service.requiresReview,
        status: service.requiresReview ? 'pending_review' : 'pending_payment',
      })
      .select('id')
      .single();

    if (dbError || !booking) {
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
    }

    // Manual-review services: return booking id, no Stripe session
    if (service.requiresReview) {
      return NextResponse.json({ bookingId: booking.id, requiresReview: true });
    }

    // Auto-confirm: create Stripe Checkout session
    const unitAmount = service.price! * (numDocuments || 1);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: unitAmount,
            product_data: {
              name: service.name,
              description: numDocuments > 1
                ? `${numDocuments} documents — ${service.priceLabel} each`
                : service.shortDescription,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
        commissionerId: commissionerId || '',
        serviceSlug,
      },
      success_url: `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?booking_cancelled=1`,
    });

    // Store stripe session id
    await supabase
      .from('co_bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', booking.id);

    return NextResponse.json({ checkoutUrl: session.url, bookingId: booking.id });
  } catch (err) {
    console.error('Booking create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
