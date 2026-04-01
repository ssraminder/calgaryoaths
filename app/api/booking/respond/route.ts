import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const action = req.nextUrl.searchParams.get('action');

  if (!token || !['accept', 'refund', 'rebook'].includes(action || '')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('confirmation_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found or link expired' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (action === 'accept') {
    await supabaseAdmin
      .from('co_bookings')
      .update({
        appointment_datetime: booking.proposed_datetime,
        status: 'confirmed',
        customer_confirmed_at: new Date().toISOString(),
        confirmation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    try {
      await sendEmail({
        to: 'info@calgaryoaths.com',
        subject: `Customer accepted new time — ${booking.name}`,
        html: `<p>${booking.name} (${booking.email}) accepted the proposed time for ${booking.service_name}.</p>`,
      });
    } catch (e) { console.error('Accept notification error:', e); }

    return NextResponse.redirect(`${siteUrl}/booking/respond?result=accepted`);
  }

  if (action === 'refund') {
    let refundId: string | null = null;
    if (booking.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
        refundId = refund.id;
      } catch (e) { console.error('Refund error:', e); }
    }

    await supabaseAdmin
      .from('co_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Customer requested refund after time change',
        confirmation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    try {
      await sendEmail({
        to: 'info@calgaryoaths.com',
        subject: `Customer requested refund — ${booking.name}`,
        html: `<p>${booking.name} (${booking.email}) requested a refund for ${booking.service_name}. ${refundId ? `Refund ID: ${refundId}` : 'Manual refund may be needed.'}</p>`,
      });
    } catch (e) { console.error('Refund notification error:', e); }

    return NextResponse.redirect(`${siteUrl}/booking/respond?result=refunded`);
  }

  if (action === 'rebook') {
    // Don't refund — keep the payment and generate a rebook token
    const rebookToken = crypto.randomBytes(32).toString('hex');

    // Mark original booking as transferred-out
    await supabaseAdmin
      .from('co_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Customer chose to rebook with a different vendor (payment transferred)',
        confirmation_token: rebookToken, // reuse field as rebook token
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    try {
      await sendEmail({
        to: 'info@calgaryoaths.com',
        subject: `Customer rebooking with different vendor — ${booking.name}`,
        html: `<p>${booking.name} (${booking.email}) is rebooking ${booking.service_name} with a different vendor. Payment from original booking (${booking.id}) will be transferred — no refund issued.</p>`,
      });
    } catch (e) { console.error('Rebook notification error:', e); }

    return NextResponse.redirect(
      `${siteUrl}/booking/respond?result=rebook&service=${booking.service_slug}&rebook=${rebookToken}`
    );
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
