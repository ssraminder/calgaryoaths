// Customer booking cancellation API — GET checks eligibility, POST executes cancellation.
// Uses vendor-configurable cancellation windows:
//   > free_cancel_hours: automatic full refund
//   free_cancel_hours to request_cancel_hours: request sent to vendor for approval
//   < request_cancel_hours: no cancellation, treated as no-show
// Uses cancel_token from the booking confirmation email for authentication.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email';
import { sendPushToCommissioner } from '@/lib/push';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

// Defaults if vendor hasn't configured
const DEFAULT_FREE_CANCEL_HOURS = 12;
const DEFAULT_REQUEST_CANCEL_HOURS = 6;

async function getVendorCancelPolicy(commissionerId: string) {
  const { data } = await supabaseAdmin
    .from('co_commissioners')
    .select('free_cancel_hours, request_cancel_hours')
    .eq('id', commissionerId)
    .single();
  return {
    freeCancelHours: data?.free_cancel_hours ?? DEFAULT_FREE_CANCEL_HOURS,
    requestCancelHours: data?.request_cancel_hours ?? DEFAULT_REQUEST_CANCEL_HOURS,
  };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('id, service_name, name, email, appointment_datetime, status, amount_paid, commissioner_id')
    .eq('cancel_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Invalid or expired cancellation link' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'This booking has already been cancelled', booking: { service_name: booking.service_name, name: booking.name } }, { status: 400 });
  }

  if (booking.status === 'pending_cancellation') {
    return NextResponse.json({
      booking: {
        id: booking.id,
        service_name: booking.service_name,
        name: booking.name,
        appointment_datetime: booking.appointment_datetime,
        amount_paid: booking.amount_paid,
        status: booking.status,
      },
      cancelTier: 'pending',
      canCancelFree: false,
      hoursUntilAppointment: null,
    });
  }

  if (!['paid', 'confirmed', 'pending_payment'].includes(booking.status)) {
    return NextResponse.json({ error: 'This booking cannot be cancelled at this time' }, { status: 400 });
  }

  // Get vendor-specific cancel policy
  const { freeCancelHours, requestCancelHours } = await getVendorCancelPolicy(booking.commissioner_id);

  const now = new Date();
  const apptTime = booking.appointment_datetime ? new Date(booking.appointment_datetime) : null;
  const hoursUntilAppt = apptTime ? (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60) : null;

  // Determine cancellation tier
  let cancelTier: 'free' | 'request' | 'blocked';
  if (hoursUntilAppt === null || hoursUntilAppt >= freeCancelHours) {
    cancelTier = 'free';
  } else if (requestCancelHours > 0 && hoursUntilAppt >= requestCancelHours) {
    cancelTier = 'request';
  } else {
    cancelTier = 'blocked';
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      service_name: booking.service_name,
      name: booking.name,
      appointment_datetime: booking.appointment_datetime,
      amount_paid: booking.amount_paid,
      status: booking.status,
    },
    cancelTier,
    canCancelFree: cancelTier === 'free',
    hoursUntilAppointment: hoursUntilAppt ? Math.round(hoursUntilAppt * 10) / 10 : null,
    freeCancelHours,
    requestCancelHours,
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

  if (booking.status === 'pending_cancellation') {
    return NextResponse.json({ error: 'Cancellation is already pending vendor review' }, { status: 400 });
  }

  if (!['paid', 'confirmed', 'pending_payment'].includes(booking.status)) {
    return NextResponse.json({ error: 'This booking cannot be cancelled' }, { status: 400 });
  }

  // Get vendor-specific cancel policy
  const { freeCancelHours, requestCancelHours } = await getVendorCancelPolicy(booking.commissioner_id);

  const now = new Date();
  const apptTime = booking.appointment_datetime ? new Date(booking.appointment_datetime) : null;
  const hoursUntilAppt = apptTime ? (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60) : null;

  // Determine cancellation tier
  let cancelTier: 'free' | 'request' | 'blocked';
  if (hoursUntilAppt === null || hoursUntilAppt >= freeCancelHours) {
    cancelTier = 'free';
  } else if (requestCancelHours > 0 && hoursUntilAppt >= requestCancelHours) {
    cancelTier = 'request';
  } else {
    cancelTier = 'blocked';
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // TIER: blocked — no cancellation allowed
  if (cancelTier === 'blocked') {
    return NextResponse.json({
      error: `Cancellations are not allowed within ${requestCancelHours > 0 ? requestCancelHours : freeCancelHours} hours of the appointment`,
    }, { status: 400 });
  }

  // TIER: request — send to vendor for approval
  if (cancelTier === 'request') {
    await supabaseAdmin
      .from('co_bookings')
      .update({
        status: 'pending_cancellation',
        cancellation_requested_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', booking.id);

    // Notify admin
    try {
      await sendEmail({
        to: 'info@calgaryoaths.com',
        subject: `[Cancel Request] ${booking.name} — ${booking.service_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#b45309;padding:24px;border-radius:8px 8px 0 0;">
              <h1 style="color:white;margin:0;font-size:22px;">Cancellation Request</h1>
            </div>
            <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
              <p>${booking.name} is requesting to cancel their booking for <strong>${booking.service_name}</strong>.</p>
              <p>This is within the vendor approval window (${freeCancelHours}h–${requestCancelHours}h before appointment).</p>
              <p>The vendor needs to approve or deny this request in their dashboard.</p>
              <div style="margin:20px 0;text-align:center;">
                <a href="${siteUrl}/admin/bookings/${booking.id}" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;font-size:14px;">View in Admin Panel</a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (e) { console.error('Cancel request admin email error:', e); }

    // Push notification to vendor
    if (booking.commissioner_id) {
      try {
        await sendPushToCommissioner(booking.commissioner_id, {
          title: 'Cancellation Request',
          body: `${booking.name} is requesting to cancel ${booking.service_name}. Tap to review.`,
          url: `/vendor/bookings/${booking.id}`,
          tag: `cancel-request-${booking.id}`,
        });
      } catch (e) { console.error('Push notification error:', e); }
    }

    return NextResponse.json({
      success: true,
      cancelTier: 'request',
      pendingApproval: true,
    });
  }

  // TIER: free — automatic refund
  let refundId: string | null = null;
  if (booking.stripe_payment_intent_id) {
    try {
      const stripeRefund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
      });
      refundId = stripeRefund.id;
    } catch (err) {
      console.error('Stripe refund error during customer cancel:', err);
    }
  }

  await supabaseAdmin
    .from('co_bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancelled_reason: `Cancelled by customer (more than ${freeCancelHours} hours before appointment)`,
      cancel_token: null,
      updated_at: now.toISOString(),
    })
    .eq('id', booking.id);

  // Notify admin
  try {
    await sendEmail({
      to: 'info@calgaryoaths.com',
      subject: `[Cancellation] ${booking.name} — ${booking.service_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#dc2626;padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;">Booking Cancelled</h1>
          </div>
          <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
            <p>${booking.name} has cancelled their booking for <strong>${booking.service_name}</strong>.</p>
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

  // Push notification to vendor
  if (booking.commissioner_id) {
    try {
      await sendPushToCommissioner(booking.commissioner_id, {
        title: 'Booking Cancelled',
        body: `${booking.name} cancelled ${booking.service_name}`,
        url: `/vendor/bookings`,
        tag: `booking-${booking.id}`,
      });
    } catch (e) { console.error('Push notification error:', e); }
  }

  return NextResponse.json({
    success: true,
    cancelTier: 'free',
    refunded: !!refundId,
  });
}
