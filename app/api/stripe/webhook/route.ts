import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
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

      // Fetch booking + commissioner to check auto-accept
      const { data: preBooking } = await supabaseAdmin.from('co_bookings').select('commissioner_id').eq('id', bookingId).single();
      const { data: commissioner } = preBooking
        ? await supabaseAdmin.from('co_commissioners').select('name, email, address, phone, auto_accept_all').eq('id', preBooking.commissioner_id).single()
        : { data: null };

      const autoConfirm = commissioner?.auto_accept_all === true;

      await supabaseAdmin
        .from('co_bookings')
        .update({
          status: autoConfirm ? 'confirmed' : 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          vendor_action_token: autoConfirm ? null : vendorToken,
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
                    <li>Your commissioner will confirm your appointment time.</li>
                    <li>You'll receive a confirmation email with final details.</li>
                    <li>If the time doesn't work, you'll be offered alternatives or a refund.</li>
                  </ol>
                </div>

                <p style="margin-top:20px;font-size:13px;color:#6B6B68;">Questions? <a href="mailto:info@calgaryoaths.com">info@calgaryoaths.com</a> or <a href="tel:5876000746">(587) 600-0746</a></p>
              </div>
            </div>
          `,
        });
      } catch (e) { console.error('Customer email error:', e); }

      // ──────── 2. VENDOR EMAIL ────────
      if (vendorEmail) {
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

                  ${bookingDetailsTable}

                  ${calendarHtml}

                  ${signersNote}

                  <h3 style="color:#1B3A5C;">Service includes:</h3>
                  <ul style="padding-left:20px;">${includedHtml || '<li>Standard commissioning</li>'}</ul>

                  <div style="margin:24px 0;text-align:center;">
                    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;background:#1B3A5C;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin-right:12px;">✓ Confirm This Time</a>
                    <a href="${actionUrl}" style="display:inline-block;padding:14px 32px;background:#C8922A;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">⏰ Suggest Another Time</a>
                  </div>

                  <p style="color:#888;font-size:13px;text-align:center;">Or manage from your <a href="${siteUrl}/vendor/bookings">Partner Portal</a></p>
                </div>
              </div>
            `,
          });
        } catch (e) { console.error('Vendor email error:', e); }
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

  return NextResponse.json({ received: true });
}
