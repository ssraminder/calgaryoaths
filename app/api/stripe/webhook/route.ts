import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      // Generate vendor action token
      const vendorToken = crypto.randomBytes(32).toString('hex');

      await supabase
        .from('co_bookings')
        .update({
          status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          vendor_action_token: vendorToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Send vendor notification email
      try {
        const { data: booking } = await supabase
          .from('co_bookings')
          .select('name, email, phone, service_name, commissioner_id, appointment_datetime, notes, num_documents, amount_paid')
          .eq('id', bookingId)
          .single();

        if (booking) {
          // Get vendor email
          const { data: commissioner } = await supabase
            .from('co_commissioners')
            .select('name, email')
            .eq('id', booking.commissioner_id)
            .single();

          const vendorEmail = commissioner?.email || 'info@calgaryoaths.com';
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const actionUrl = `${siteUrl}/booking/vendor-action?token=${vendorToken}`;
          const acceptUrl = `${actionUrl}&action=accept`;

          const apptDate = booking.appointment_datetime
            ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
                timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
              })
            : 'Not specified';

          await sendEmail({
            to: [vendorEmail, 'info@calgaryoaths.com'],
            subject: `New paid booking — ${booking.name} — ${booking.service_name}`,
            html: `
              <h2>New Booking Received</h2>
              <p>A customer has paid and is waiting for your confirmation.</p>

              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Customer</td><td style="padding:8px;border:1px solid #ddd">${booking.name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #ddd">${booking.service_name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Requested Time</td><td style="padding:8px;border:1px solid #ddd"><strong>${apptDate}</strong></td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Documents</td><td style="padding:8px;border:1px solid #ddd">${booking.num_documents}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Amount Paid</td><td style="padding:8px;border:1px solid #ddd">$${((booking.amount_paid || 0) / 100).toFixed(2)}</td></tr>
                ${booking.notes ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Notes</td><td style="padding:8px;border:1px solid #ddd">${booking.notes}</td></tr>` : ''}
              </table>

              <div style="margin:24px 0;">
                <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#1B3A5C;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin-right:12px;">Confirm This Time</a>
                <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;background:#C8922A;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Suggest Another Time</a>
              </div>

              <p style="color:#888;font-size:13px;">You can also manage this booking from your <a href="${siteUrl}/vendor/bookings">Partner Portal</a> or the <a href="${siteUrl}/admin/bookings">Admin Panel</a>.</p>
            `,
          });
        }
      } catch (emailErr) {
        console.error('Vendor notification email error:', emailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
