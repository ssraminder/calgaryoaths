import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { createCheckoutSessionForBooking } from '@/lib/booking-checkout';

type Body = {
  service_slug: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  num_documents?: number;
  appointment_datetime: string;
};

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const missing = ['service_slug', 'name', 'email', 'phone', 'appointment_datetime']
    .filter((k) => !body[k as keyof Body]);
  if (missing.length) {
    return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
  }

  const { data: service } = await supabaseAdmin
    .from('co_services')
    .select('slug, name, active')
    .eq('slug', body.service_slug)
    .single();
  if (!service || !service.active) {
    return NextResponse.json({ error: 'Invalid or inactive service' }, { status: 400 });
  }

  const { data: commServiceLink } = await supabaseAdmin
    .from('co_commissioner_services')
    .select('service_slug')
    .eq('commissioner_id', vendor.commissionerId)
    .eq('service_slug', body.service_slug)
    .single();
  if (!commServiceLink) {
    return NextResponse.json({ error: 'You do not offer this service' }, { status: 400 });
  }

  const { data: booking, error: insertErr } = await supabaseAdmin
    .from('co_bookings')
    .insert({
      service_slug: body.service_slug,
      service_name: service.name,
      commissioner_id: vendor.commissionerId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      notes: body.notes || null,
      num_documents: body.num_documents || 1,
      delivery_mode: 'in_office',
      requires_review: false,
      status: 'pending_scheduling',
      admin_notes: `Created on behalf of customer by vendor (${vendor.commissionerName})`,
    })
    .select('id')
    .single();

  if (insertErr || !booking) {
    console.error('Vendor create-for-customer insert error:', insertErr);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }

  const result = await createCheckoutSessionForBooking(booking.id, body.appointment_datetime);

  if (!result.ok) {
    await supabaseAdmin.from('co_bookings').delete().eq('id', booking.id);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ('paymentTransferred' in result && result.paymentTransferred) {
    return NextResponse.json({ bookingId: booking.id, paymentTransferred: true });
  }

  const checkoutUrl = result.checkoutUrl;
  const apptDate = new Date(body.appointment_datetime).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
  });
  const totalLabel = `$${(result.totalChargedCents / 100).toFixed(2)} CAD`;

  try {
    await sendEmail({
      to: body.email,
      subject: `Complete your booking — ${service.name}`,
      html: `
        <h2>Your booking is ready — complete payment to confirm</h2>
        <p>Hi ${body.name},</p>
        <p>We've prepared a booking for you based on our conversation. To confirm your appointment, please complete payment at the secure link below.</p>
        <p><strong>Service:</strong> ${service.name}<br/>
        <strong>Commissioner:</strong> ${vendor.commissionerName}<br/>
        <strong>Appointment:</strong> ${apptDate}<br/>
        <strong>Total:</strong> ${totalLabel}</p>
        <p style="margin:24px 0;">
          <a href="${checkoutUrl}" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;">Pay and Confirm Booking</a>
        </p>
        <p style="color:#666;font-size:13px;">Your slot is held for a short time while you complete payment. If the link expires, reply to this email and we'll send a new one.</p>
        <p>Thank you,<br/>Calgary Oaths</p>
      `,
    });
  } catch (e) {
    console.error('Payment link email error:', e);
  }

  return NextResponse.json({
    bookingId: booking.id,
    checkoutUrl,
    totalChargedCents: result.totalChargedCents,
  });
}
