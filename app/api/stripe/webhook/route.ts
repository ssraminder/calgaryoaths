// Stripe webhook handler — processes checkout.session.completed and charge.refunded events.
// Updates booking status, generates cancel_token for customer self-service cancellation,
// and sends confirmation emails (customer with cancel link, vendor, admin).
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { sendPushToCommissioner } from '@/lib/push';
import { calendarLinksHtml, locationHtml } from '@/lib/calendar';
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
      const cancelToken = crypto.randomBytes(32).toString('hex');

      // Fetch booking + commissioner to check auto-accept
      const { data: preBooking } = await supabaseAdmin.from('co_bookings').select('commissioner_id').eq('id', bookingId).single();
      const { data: commissioner } = preBooking
        ? await supabaseAdmin.from('co_commissioners').select('name, email, address, phone, auto_accept_all, free_cancel_hours, request_cancel_hours').eq('id', preBooking.commissioner_id).single()
        : { data: null };

      const autoConfirm = commissioner?.auto_accept_all === true;

      await supabaseAdmin
        .from('co_bookings')
        .update({
          status: autoConfirm ? 'confirmed' : 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          vendor_action_token: autoConfirm ? null : vendorToken,
          cancel_token: cancelToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      const { data: booking } = await supabaseAdmin.from('co_bookings').select('*').eq('id', bookingId).single();
      if (!booking) return NextResponse.json({ received: true });

      const { data: service } = await supabaseAdmin
        .from('co_services')
        .select('what_to_bring, important_notes, what_is_included, signers_required')
        .eq('slug', booking.service_slug)
        .single();

      const { data: location } = booking.location_id
        ? await supabaseAdmin.from('co_locations').select('name, address').eq('id', booking.location_id).single()
        : { data: null };

      const vendorEmail = commissioner?.email || '';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const cancelUrl = `${siteUrl}/booking/cancel?token=${cancelToken}`;
      const actionUrl = `${siteUrl}/booking/vendor-action?token=${vendorToken}`;
      const acceptUrl = `${actionUrl}&action=accept`;
      const isMobile = booking.delivery_mode === 'mobile';

      const apptDate = booking.appointment_datetime
        ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
            timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
          })
        : 'To be confirmed';

      const locationAddr = isMobile
        ? booking.customer_address || 'Customer location'
        : location?.address || commissioner?.address || 'Calgary, AB';
      const locationLabel = isMobile
        ? `Mobile service — ${locationAddr}`
        : location?.name ? `${location.name} — ${location.address}` : commissioner?.address || '';
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddr)}`;
      const locationText = `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#C8922A;text-decoration:underline;">${locationLabel} ↗</a>`;

      const whatToBring = service?.what_to_bring ?? ['Valid government-issued photo ID', 'Your documents — unsigned'];
      const importantNotes = service?.important_notes ?? ['Do NOT sign documents before the appointment'];
      const whatIsIncluded = service?.what_is_included ?? [];
      const signersRequired = service?.signers_required ?? 1;

      const bringListHtml = whatToBring.map((item: string) => `<li style="margin-bottom:4px;">${item}</li>`).join('');
      const notesHtml = importantNotes.map((item: string) => `<li style="margin-bottom:4px;color:#b45309;"><strong>${item}</strong></li>`).join('');
      const includedHtml = whatIsIncluded.map((item: string) => `<li style="margin-bottom:4px;">${item}</li>`).join('');

      const signersNote = signersRequired > 1
        ? `<p style="margin-top:12px;padding:10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:14px;"><strong>⚠ ${signersRequired} people required:</strong> This service requires ${signersRequired} people to be present, each with valid government-issued photo ID.</p>`
        : '';

      const bookingDetailsTable = `
        <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4;width:35%">Service</td><td style="padding:10px;border:1px solid #e2e0da">${booking.service_name}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer</td><td style="padding:10px;border:1px solid #e2e0da">${booking.name}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Email</td><td style="padding:10px;border:1px solid #e2e0da"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Phone</td><td style="padding:10px;border:1px solid #e2e0da"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Appointment</td><td style="padding:10px;border:1px solid #e2e0da"><strong>${apptDate}</strong></td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Location</td><td style="padding:10px;border:1px solid #e2e0da">${locationText}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Documents</td><td style="padding:10px;border:1px solid #e2e0da">${booking.num_documents}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Amount Paid</td><td style="padding:10px;border:1px solid #e2e0da;color:#1D9E75;font-weight:bold">$${((booking.amount_paid || 0) / 100).toFixed(2)} CAD</td></tr>
          ${booking.notes ? `<tr><td style="padding:10px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer Notes</td><td style="padding:10px;border:1px solid #e2e0da">${booking.notes}</td></tr>` : ''}
        </table>`;

      const calendarHtml = booking.appointment_datetime
        ? calendarLinksHtml({
            title: `${booking.service_name} — Calgary Oaths`,
            description: `Commissioner: ${commissioner?.name || 'Calgary Oaths'}\nCustomer: ${booking.name}\nPhone: ${commissioner?.phone || '(587) 600-0746'}`,
            location: isMobile
              ? booking.customer_address || 'Mobile service'
              : commissioner?.address || 'Calgary, AB',
            startTime: booking.appointment_datetime,
            durationMinutes: 30,
          })
        : '';

      // ──────── 1. CUSTOMER EMAIL ────────
      try {
        await sendEmail({
          to: booking.email,
          subject: `Booking received — ${booking.service_name} — Calgary Oaths`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1B3A5C;padding:24px;border-radius:8px 8px 0 0;">
                <h1 style="color:white;margin:0;font-size:22px;">Booking Received</h1>
              </div>
              <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
                <p style="font-size:16px;">Hi ${booking.name},</p>
                <p>Thank you for your booking. Your payment of <strong>$${((booking.amount_paid || 0) / 100).toFixed(2)}</strong> has been received.</p>

                ${bookingDetailsTable}

                ${calendarHtml}

                <p><strong>Commissioner:</strong> ${commissioner?.name || ''}</p>
                ${commissioner?.phone ? `<p><strong>Commissioner Phone:</strong> <a href="tel:${commissioner.phone}">${commissioner.phone}</a></p>` : ''}

                ${signersNote}

                <h3 style="color:#1B3A5C;margin-top:24px;border-bottom:2px solid #C8922A;padding-bottom:8px;">📋 What to Bring</h3>
                <ul style="padding-left:20px;">${bringListHtml}</ul>

                <h3 style="color:#b45309;margin-top:20px;">⚠ Important</h3>
                <ul style="padding-left:20px;list-style:none;">${notesHtml}</ul>

                ${includedHtml ? `<h3 style="color:#1B3A5C;margin-top:20px;">✓ What's Included</h3><ul style="padding-left:20px;">${includedHtml}</ul>` : ''}

                <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                  <p style="margin:0;font-size:14px;"><strong>What happens next?</strong></p>
                  <ol style="margin:8px 0 0;padding-left:20px;font-size:14px;">
                    <li>Your commissioner will review your request and respond shortly with a confirmation. <strong>This appointment is not final unless it is confirmed by the commissioner.</strong></li>
                    <li>You'll receive a confirmation email with final details.</li>
                    <li>If the time doesn't work, you'll be offered alternatives or a refund.</li>
                  </ol>
                </div>

                <div style="margin-top:24px;padding:16px;background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;">
                  <h3 style="margin:0 0 8px;font-size:15px;color:#92400e;">⚠ Cancellation Policy</h3>
                  <ul style="margin:0;padding-left:20px;font-size:13px;color:#92400e;">
                    <li style="margin-bottom:4px;"><strong>More than ${commissioner?.free_cancel_hours ?? 12} hours before appointment:</strong> Full refund — cancel at no charge.</li>
                    <li style="margin-bottom:4px;"><strong>Within ${commissioner?.free_cancel_hours ?? 12} hours of appointment:</strong> No refund — treated as a no-show.</li>
                    <li style="margin-bottom:4px;">No-shows without prior notice are not eligible for a refund.</li>
                  </ul>
                  <p style="margin:10px 0 0;"><a href="${cancelUrl}" style="color:#C8922A;font-weight:bold;text-decoration:underline;font-size:14px;">Cancel this booking</a></p>
                </div>

                <div style="margin-top:16px;padding:16px;background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;">
                  <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b;">📋 Terms & Conditions — Please Read</h3>
                  <ul style="margin:0;padding-left:20px;font-size:13px;color:#991b1b;">
                    <li style="margin-bottom:4px;"><strong>Valid ID required:</strong> You must present a valid, government-issued photo ID (passport, driver's licence, PR card). Expired or invalid ID will result in cancellation without refund.</li>
                    <li style="margin-bottom:4px;"><strong>Do NOT sign your documents before the appointment.</strong> Documents must be signed in the presence of the commissioner.</li>
                    <li style="margin-bottom:4px;"><strong>Arrive on time.</strong> If you are more than 15 minutes late, the appointment may be cancelled as a no-show.</li>
                    <li style="margin-bottom:4px;"><strong>Truthfulness:</strong> All information in your documents must be accurate. You are swearing under oath — providing false information is a criminal offence.</li>
                    ${signersRequired > 1 ? `<li style="margin-bottom:4px;"><strong>${signersRequired} people must be present,</strong> each with valid government-issued photo ID.</li>` : ''}
                    <li style="margin-bottom:4px;">Additional documents or complex services beyond the booking scope may incur extra charges, communicated before the appointment begins.</li>
                  </ul>
                  <p style="margin:10px 0 0;font-size:12px;color:#6B6B68;">By booking, you agree to our full <a href="${siteUrl}/terms-and-conditions" style="color:#C8922A;font-weight:bold;">Terms & Conditions</a>.</p>
                </div>

                ${!isMobile && locationLabel ? `
                <div style="margin-top:16px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
                  <h3 style="margin:0 0 6px;font-size:14px;color:#1B3A5C;">📍 Appointment Location</h3>
                  <p style="margin:0;font-size:13px;">${locationText}</p>
                </div>
                ` : ''}

                <div style="margin-top:16px;padding:16px;background:#f8f7f4;border:1px solid #e2e0da;border-radius:8px;text-align:center;">
                  <p style="margin:0;font-size:14px;font-weight:bold;color:#1B3A5C;">Calgary Oaths — Customer Care</p>
                  <p style="margin:6px 0 0;font-size:14px;">
                    <a href="tel:5876000746" style="color:#C8922A;font-weight:bold;text-decoration:none;">(587) 600-0746</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:info@calgaryoaths.com" style="color:#C8922A;font-weight:bold;text-decoration:none;">info@calgaryoaths.com</a>
                  </p>
                  <p style="margin:4px 0 0;font-size:11px;color:#6B6B68;">Mon–Fri 9 AM – 9 PM · Sat 10 AM – 5 PM</p>
                </div>
              </div>
            </div>
          `,
        });
      } catch (e) { console.error('Customer email error:', e); }

      // ──────── 2. VENDOR EMAIL ────────
      if (vendorEmail) {
        const vendorCalendarHtml = booking.appointment_datetime
          ? calendarLinksHtml({
              title: `${booking.service_name} — ${booking.name}`,
              description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}${booking.notes ? `\nNotes: ${booking.notes}` : ''}`,
              location: isMobile
                ? booking.customer_address || 'Mobile service'
                : location?.address || commissioner?.address || 'Calgary, AB',
              startTime: booking.appointment_datetime,
              durationMinutes: 30,
            })
          : '';

        try {
          await sendEmail({
            to: vendorEmail,
            subject: `New booking — ${booking.name} — ${booking.service_name}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1B3A5C;padding:24px;border-radius:8px 8px 0 0;">
                  <h1 style="color:white;margin:0;font-size:22px;">New Booking — Action Required</h1>
                </div>
                <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
                  <p>A customer has booked and paid. Please confirm or suggest a different time.</p>

                  <div style="margin:24px 0;text-align:center;">
                    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;background:#1D9E75;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin-right:12px;">✓ Confirm This Time</a>
                    <a href="${actionUrl}" style="display:inline-block;padding:14px 32px;background:#C8922A;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">⏰ Suggest Another Time</a>
                  </div>

                  ${bookingDetailsTable}

                  ${vendorCalendarHtml}

                  <h3 style="color:#1B3A5C;margin-top:24px;border-bottom:2px solid #C8922A;padding-bottom:8px;">👤 Customer Information</h3>
                  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:8px 0;">
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4;width:35%">Name</td><td style="padding:8px;border:1px solid #e2e0da">${booking.name}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Phone</td><td style="padding:8px;border:1px solid #e2e0da"><a href="tel:${booking.phone}" style="color:#C8922A;">${booking.phone}</a></td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Email</td><td style="padding:8px;border:1px solid #e2e0da"><a href="mailto:${booking.email}" style="color:#C8922A;">${booking.email}</a></td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Delivery Mode</td><td style="padding:8px;border:1px solid #e2e0da">${isMobile ? '🚗 Mobile — at customer location' : booking.delivery_mode === 'virtual' ? '💻 Virtual' : '🏢 In-Office'}</td></tr>
                    ${isMobile && booking.customer_address ? `<tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer Address</td><td style="padding:8px;border:1px solid #e2e0da"><a href="${mapsUrl}" style="color:#C8922A;">${booking.customer_address} ↗</a></td></tr>` : ''}
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Documents</td><td style="padding:8px;border:1px solid #e2e0da">${booking.num_documents}</td></tr>
                    ${booking.notes ? `<tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer Notes</td><td style="padding:8px;border:1px solid #e2e0da;background:#fef3c7;"><strong>${booking.notes}</strong></td></tr>` : ''}
                  </table>

                  ${signersNote}

                  <h3 style="color:#1B3A5C;margin-top:24px;border-bottom:2px solid #C8922A;padding-bottom:8px;">📋 Service Details</h3>
                  <p style="font-size:14px;"><strong>Service:</strong> ${booking.service_name}</p>
                  ${includedHtml ? `<p style="font-size:14px;margin-top:8px;"><strong>What's included:</strong></p><ul style="padding-left:20px;font-size:14px;">${includedHtml}</ul>` : ''}
                  <p style="font-size:14px;margin-top:8px;"><strong>Customer should bring:</strong></p>
                  <ul style="padding-left:20px;font-size:14px;">${bringListHtml}</ul>

                  <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;">
                    <h3 style="margin:0 0 8px;font-size:15px;color:#166534;">✅ Do's — Before the Appointment</h3>
                    <ul style="margin:0;padding-left:20px;font-size:13px;color:#166534;">
                      <li style="margin-bottom:4px;">Verify the customer's government-issued photo ID (must be valid, not expired)</li>
                      <li style="margin-bottom:4px;">Confirm documents are <strong>unsigned</strong> — signing must happen in your presence</li>
                      <li style="margin-bottom:4px;">Ensure all required parties are present${signersRequired > 1 ? ` (${signersRequired} people required for this service)` : ''}</li>
                      <li style="margin-bottom:4px;">Confirm the customer understands they are swearing/affirming under oath</li>
                      ${isMobile ? '<li style="margin-bottom:4px;">Confirm the meeting location is accessible and suitable</li>' : ''}
                    </ul>
                  </div>

                  <div style="margin-top:12px;padding:16px;background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;">
                    <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b;">❌ Don'ts — Grounds for Cancellation (No Refund)</h3>
                    <ul style="margin:0;padding-left:20px;font-size:13px;color:#991b1b;">
                      <li style="margin-bottom:4px;">Do not proceed if ID is expired, invalid, damaged, or doesn't match the person</li>
                      <li style="margin-bottom:4px;">Do not commission if documents are already signed</li>
                      <li style="margin-bottom:4px;">Do not proceed if you suspect misrepresentation, fraud, or false information</li>
                      <li style="margin-bottom:4px;">Do not proceed if the person appears intoxicated or unable to understand the oath</li>
                      <li style="margin-bottom:4px;">Do not proceed if the person refuses to swear or affirm</li>
                      <li style="margin-bottom:4px;">Do not proceed if the person is abusive or threatening</li>
                    </ul>
                  </div>

                  <div style="margin-top:16px;padding:16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;">
                    <h3 style="margin:0 0 6px;font-size:14px;color:#92400e;">⚠ Cancellation Policy Reminder</h3>
                    <p style="margin:0;font-size:13px;color:#92400e;">Free cancellation for the customer is available up to <strong>${commissioner?.free_cancel_hours ?? 12} hours</strong> before the appointment. After that, no refund is issued. If you need to cancel, please contact Calgary Oaths at <a href="tel:5876000746" style="color:#C8922A;">(587) 600-0746</a>.</p>
                  </div>

                  <div style="margin:24px 0;text-align:center;">
                    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;background:#1D9E75;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin-right:12px;">✓ Confirm This Time</a>
                    <a href="${actionUrl}" style="display:inline-block;padding:14px 32px;background:#C8922A;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">⏰ Suggest Another Time</a>
                  </div>

                  <p style="color:#888;font-size:13px;text-align:center;">Or manage from your <a href="${siteUrl}/vendor/bookings" style="color:#C8922A;">Partner Portal</a></p>
                </div>
              </div>
            `,
          });
        } catch (e) { console.error('Vendor email error:', e); }
      }

      // ──────── PUSH NOTIFICATION TO VENDOR ────────
      if (booking.commissioner_id) {
        try {
          await sendPushToCommissioner(booking.commissioner_id, {
            title: 'New Booking',
            body: `${booking.name} — ${booking.service_name} — ${apptDate}`,
            url: `/vendor/bookings`,
            tag: `booking-${bookingId}`,
          });
        } catch (e) { console.error('Push notification error:', e); }
      }

      // ──────── 3. ADMIN EMAIL ────────
      try {
        await sendEmail({
          to: 'info@calgaryoaths.com',
          subject: `[Admin] Paid booking — ${booking.name} — ${booking.service_name} — ${commissioner?.name || booking.commissioner_id}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#2C2C2A;padding:24px;border-radius:8px 8px 0 0;">
                <h1 style="color:white;margin:0;font-size:22px;">New Paid Booking</h1>
              </div>
              <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
                <p>A booking has been paid and is awaiting commissioner confirmation.</p>

                ${bookingDetailsTable}

                <h3 style="color:#1B3A5C;">Commissioner Details</h3>
                <table style="border-collapse:collapse;width:100%;font-size:14px;">
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Name</td><td style="padding:8px;border:1px solid #e2e0da">${commissioner?.name || booking.commissioner_id}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Email</td><td style="padding:8px;border:1px solid #e2e0da">${vendorEmail || 'Not set'}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Phone</td><td style="padding:8px;border:1px solid #e2e0da">${commissioner?.phone || 'Not set'}</td></tr>
                </table>

                <h3 style="color:#1B3A5C;margin-top:16px;">Financial Breakdown</h3>
                <table style="border-collapse:collapse;width:100%;font-size:14px;">
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Total Charged</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.total_charged_cents || booking.amount_paid || 0) / 100).toFixed(2)}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Convenience Fee</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.convenience_fee_cents || 0) / 100).toFixed(2)}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Tax</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.tax_cents || 0) / 100).toFixed(2)}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Platform Fee</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.platform_fee_cents || 0) / 100).toFixed(2)}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Vendor Payout</td><td style="padding:8px;border:1px solid #e2e0da">$${((booking.vendor_payout_cents || 0) / 100).toFixed(2)}</td></tr>
                  ${booking.travel_fee_cents ? `<tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Travel Fee</td><td style="padding:8px;border:1px solid #e2e0da">$${(booking.travel_fee_cents / 100).toFixed(2)}</td></tr>` : ''}
                  <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Commission Rate</td><td style="padding:8px;border:1px solid #e2e0da">${booking.commission_rate || 0}% (${booking.commission_mode || 'n/a'})</td></tr>
                </table>

                <p style="margin-top:16px;"><strong>Booking ID:</strong> <code>${bookingId}</code></p>
                <p><strong>Stripe PI:</strong> <code>${booking.stripe_payment_intent_id || 'n/a'}</code></p>

                <div style="margin:20px 0;text-align:center;">
                  <a href="${siteUrl}/admin/bookings/${bookingId}" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;font-size:14px;">View in Admin Panel</a>
                </div>
              </div>
            </div>
          `,
        });
      } catch (e) { console.error('Admin email error:', e); }
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent as string;

    if (paymentIntentId) {
      const { data: booking } = await supabaseAdmin
        .from('co_bookings')
        .select('id, status, name, service_name, email')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (booking && booking.status !== 'refunded') {
        const isFullRefund = charge.amount_refunded === charge.amount;

        await supabaseAdmin
          .from('co_bookings')
          .update({
            status: isFullRefund ? 'refunded' : booking.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        // Notify admin of dashboard-initiated refund
        try {
          await sendEmail({
            to: 'info@calgaryoaths.com',
            subject: `[Admin] ${isFullRefund ? 'Full' : 'Partial'} refund — ${booking.name} — ${booking.service_name}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#b45309;padding:24px;border-radius:8px 8px 0 0;">
                  <h1 style="color:white;margin:0;font-size:22px;">${isFullRefund ? 'Full' : 'Partial'} Refund Processed</h1>
                </div>
                <div style="padding:24px;background:white;border:1px solid #e2e0da;border-top:none;border-radius:0 0 8px 8px;">
                  <p>A refund was processed via Stripe for the following booking:</p>
                  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Customer</td><td style="padding:8px;border:1px solid #e2e0da">${booking.name}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Service</td><td style="padding:8px;border:1px solid #e2e0da">${booking.service_name}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Refunded</td><td style="padding:8px;border:1px solid #e2e0da">$${(charge.amount_refunded / 100).toFixed(2)} of $${(charge.amount / 100).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e0da;font-weight:bold;background:#f8f7f4">Stripe PI</td><td style="padding:8px;border:1px solid #e2e0da"><code>${paymentIntentId}</code></td></tr>
                  </table>
                  ${isFullRefund ? '<p>Booking status has been updated to <strong>refunded</strong>.</p>' : '<p>Partial refund — booking status unchanged.</p>'}
                </div>
              </div>
            `,
          });
        } catch (e) { console.error('Refund admin email error:', e); }
      }
    }
  }

  return NextResponse.json({ received: true });
}
