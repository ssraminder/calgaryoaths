import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

const CANCEL_WINDOW_HOURS = 12;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('id, service_name, name, email, appointment_datetime, status, amount_paid')
    .eq('cancel_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Invalid or expired cancellation link' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'This booking has already been cancelled', booking: { service_name: booking.service_name, name: booking.name } }, { status: 400 });
  }

  if (!['paid', 'confirmed', 'pending_payment'].includes(booking.status)) {
    return NextResponse.json({ error: 'This booking cannot be cancelled at this time' }, { status: 400 });
  }

  // Determine if within cancellation window
  const now = new Date();
  const apptTime = booking.appointment_datetime ? new Date(booking.appointment_datetime) : null;
  const hoursUntilAppt = apptTime ? (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
  const isWithinWindow = hoursUntilAppt !== null && hoursUntilAppt < CANCEL_WINDOW_HOURS;

  return NextResponse.json({
    booking: {
      id: booking.id,
      service_name: booking.service_name,
      name: booking.name,
      appointment_datetime: booking.appointment_datetime,
      amount_paid: booking.amount_paid,
      status: booking.status,
    },
    canCancelFree: !isWithinWindow,
    hoursUntilAppointment: hoursUntilAppt ? Math.round(hoursUntilAppt * 10) / 10 : null,
  });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('cancel_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Invalid or expired cancellation link' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
  }

  if (!['paid', 'confirmed', 'pending_payment'].includes(booking.status)) {
    return NextResponse.json({ error: 'This booking cannot be cancelled' }, { status: 400 });
  }

  const now = new Date();
  const apptTime = booking.appointment_datetime ? new Date(booking.appointment_datetime) : null;
  const hoursUntilAppt = apptTime ? (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
  const canRefund = hoursUntilAppt === null || hoursUntilAppt >= CANCEL_WINDOW_HOURS;

  let refundId: string | null = null;

  // Issue refund if cancelling more than 12 hours before appointment
  if (canRefund && booking.stripe_payment_intent_id) {
    try {
      const stripeRefund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
      });
      refundId = stripeRefund.id;
    } catch (err) {
      console.error('Stripe refund error during customer cancel:', err);
      // Continue with cancellation even if refund fails — admin can handle manually
    }
  }

  // Update booking status
  await supabaseAdmin
    .from('co_bookings')
    .update({
      status: canRefund ? 'cancelled' : 'no_show',
      cancelled_at: now.toISOString(),
      cancelled_reason: canRefund
        ? 'Cancelled by customer (more than 12 hours before appointment)'
        : 'Cancelled by customer within 12 hours — treated as no-show',
      cancel_token: null,
      updated_at: now.toISOString(),
    })
    .eq('id', booking.id);

  // Notify admin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    await sendEmail({
      to: 'info@calgaryoaths.com',
      subject: `[Cancellation] ${booking.name} — ${booking.service_name}${!canRefund ? ' (NO-SHOW)' : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:${canRefund ? '#dc2626' : '#b45309'};padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;">${canRefund ? 'Booking Cancelled' : 'Late Cancellation (No-Show)'}</h1>
          </div>
          <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
            <p>${booking.name} has cancelled their booking for <strong>${booking.service_name}</strong>.</p>
            ${!canRefund ? '<p style="color:#b45309;font-weight:bold;">This was within 12 hours of the appointment and is treated as a no-show. No refund was issued.</p>' : ''}
            ${refundId ? `<p>Stripe refund issued: <code>${refundId}</code></p>` : ''}
            <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Booking ID</td><td style="padding:8px;border:1px solid #e2e0da"><code>${booking.id}</code></td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer</td><td style="padding:8px;border:1px solid #e2e0da">${booking.name} (${booking.email})</td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Amount</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.amount_paid || 0) / 100).toFixed(2)}</td></tr>
            </table>
            <div style="margin:20px 0;text-align:center;">
              <a href="${siteUrl}/admin/bookings/${booking.id}" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;font-size:14px;">View in Admin Panel</a>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error('Cancel admin email error:', e);
  }

  return NextResponse.json({
    success: true,
    refunded: canRefund && !!refundId,
    noShow: !canRefund,
  });
}
