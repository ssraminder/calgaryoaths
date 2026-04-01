import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
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
      const vendorToken = crypto.randomBytes(32).toString('hex');

      await supabaseAdmin
        .from('co_bookings')
        .update({
          status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          vendor_action_token: vendorToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Fetch booking details
      const { data: booking } = await supabaseAdmin
        .from('co_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (booking) {
        const { data: commissioner } = await supabaseAdmin
          .from('co_commissioners')
          .select('name, email, address, phone')
          .eq('id', booking.commissioner_id)
          .single();

        // Get location details
        const { data: location } = booking.location_id
          ? await supabaseAdmin.from('co_locations').select('name, address').eq('id', booking.location_id).single()
          : { data: null };

        const vendorEmail = commissioner?.email || '';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const actionUrl = `${siteUrl}/booking/vendor-action?token=${vendorToken}`;
        const acceptUrl = `${actionUrl}&action=accept`;
        const isMobile = booking.delivery_mode === 'mobile';

        const apptDate = booking.appointment_datetime
          ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
              timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
            })
          : 'Not specified';

        const locationText = isMobile
          ? `Mobile — ${booking.customer_address || 'Customer location'}`
          : location?.name ? `${location.name} — ${location.address}` : commissioner?.address || '';

        const bookingTable = `
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #ddd">${booking.service_name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Customer</td><td style="padding:8px;border:1px solid #ddd">${booking.name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Requested Time</td><td style="padding:8px;border:1px solid #ddd"><strong>${apptDate}</strong></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Location</td><td style="padding:8px;border:1px solid #ddd">${locationText}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Documents</td><td style="padding:8px;border:1px solid #ddd">${booking.num_documents}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Amount Paid</td><td style="padding:8px;border:1px solid #ddd">$${((booking.amount_paid || 0) / 100).toFixed(2)}</td></tr>
            ${booking.notes ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Notes</td><td style="padding:8px;border:1px solid #ddd">${booking.notes}</td></tr>` : ''}
          </table>`;

        // 1. CUSTOMER confirmation email
        try {
          await sendEmail({
            to: booking.email,
            subject: `Booking received — ${booking.service_name} — Calgary Oaths`,
            html: `
              <h2>Your Booking Has Been Received!</h2>
              <p>Hi ${booking.name},</p>
              <p>Thank you for your payment. Here are your booking details:</p>
              ${bookingTable}
              <p><strong>Commissioner:</strong> ${commissioner?.name || ''}</p>
              <p><strong>What happens next:</strong></p>
              <ol>
                <li>Your commissioner will review and confirm your appointment time.</li>
                <li>You'll receive a confirmation email with the final details and what to bring.</li>
                <li>If the time doesn't work, they'll propose an alternative — you can accept, choose another vendor, or request a refund.</li>
              </ol>
              <p style="margin-top:16px;padding:12px;background:#f8f7f4;border-radius:8px;">
                <strong>Important:</strong> Bring a valid government-issued photo ID and your documents <strong>unsigned</strong>.
              </p>
              <p>Questions? Contact us at <a href="mailto:info@calgaryoaths.com">info@calgaryoaths.com</a> or <a href="tel:5876000746">(587) 600-0746</a>.</p>
              <p>Thank you,<br/>Calgary Oaths</p>
            `,
          });
        } catch (e) { console.error('Customer payment email error:', e); }

        // 2. VENDOR notification email (with accept/suggest actions)
        if (vendorEmail) {
          try {
            await sendEmail({
              to: vendorEmail,
              subject: `New booking — ${booking.name} — ${booking.service_name}`,
              html: `
                <h2>New Booking Received</h2>
                <p>A customer has paid and is waiting for your confirmation.</p>
                ${bookingTable}
                <div style="margin:24px 0;">
                  <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#1B3A5C;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin-right:12px;">Confirm This Time</a>
                  <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;background:#C8922A;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Suggest Another Time</a>
                </div>
                <p style="color:#888;font-size:13px;">You can also manage this booking from your <a href="${siteUrl}/vendor/bookings">Partner Portal</a>.</p>
              `,
            });
          } catch (e) { console.error('Vendor notification email error:', e); }
        }

        // 3. ADMIN notification email
        try {
          await sendEmail({
            to: 'info@calgaryoaths.com',
            subject: `[Admin] New paid booking — ${booking.name} — ${booking.service_name}`,
            html: `
              <h2>New Paid Booking</h2>
              <p>A new booking has been paid and is awaiting commissioner confirmation.</p>
              ${bookingTable}
              <p><strong>Commissioner:</strong> ${commissioner?.name || booking.commissioner_id} (${vendorEmail || 'no email'})</p>
              <p><strong>Booking ID:</strong> ${bookingId}</p>
              <div style="margin:16px 0;">
                <a href="${siteUrl}/admin/bookings/${bookingId}" style="display:inline-block;padding:10px 20px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;font-size:14px;">View in Admin Panel</a>
              </div>
            `,
          });
        } catch (e) { console.error('Admin notification email error:', e); }
      }
    }
  }

  return NextResponse.json({ received: true });
}
