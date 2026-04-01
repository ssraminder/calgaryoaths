import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  // Fetch booking by vendor action token
  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('id, name, email, phone, service_name, commissioner_id, appointment_datetime, status, amount_paid, notes, num_documents, created_at')
    .eq('vendor_action_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found or link expired' }, { status: 404 });
  }

  // Fetch vendor availability slots for next 14 days
  const { data: rules } = await supabaseAdmin
    .from('co_availability_rules')
    .select('day_of_week, start_time, end_time')
    .eq('commissioner_id', booking.commissioner_id)
    .eq('active', true);

  // Fetch already booked slots
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 14);

  const { data: booked } = await supabaseAdmin
    .from('co_bookings')
    .select('appointment_datetime')
    .eq('commissioner_id', booking.commissioner_id)
    .not('appointment_datetime', 'is', null)
    .in('status', ['pending_payment', 'paid', 'confirmed'])
    .gte('appointment_datetime', now.toISOString())
    .lte('appointment_datetime', windowEnd.toISOString());

  return NextResponse.json({
    booking,
    availabilityRules: rules ?? [],
    bookedSlots: (booked ?? []).map((b) => b.appointment_datetime),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, action, proposed_datetime, reason } = body as {
    token: string;
    action: 'accept' | 'propose';
    proposed_datetime?: string;
    reason?: string;
  };

  if (!token || !action) {
    return NextResponse.json({ error: 'Missing token or action' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('vendor_action_token', token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found or link expired' }, { status: 404 });
  }

  if (action === 'accept') {
    // Confirm the booking
    await supabaseAdmin
      .from('co_bookings')
      .update({
        status: 'confirmed',
        vendor_action_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    // Email customer
    const apptDate = booking.appointment_datetime
      ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
          timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
        })
      : '';

    try {
      await sendEmail({
        to: booking.email,
        subject: `Booking confirmed — ${booking.service_name}`,
        html: `
          <h2>Your Booking is Confirmed!</h2>
          <p>Hi ${booking.name},</p>
          <p>Your appointment for <strong>${booking.service_name}</strong> has been confirmed.</p>
          <p><strong>Date & Time:</strong> ${apptDate}</p>
          <p>If you need to make changes, please contact us at info@calgaryoaths.com.</p>
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    } catch (e) { console.error('Confirm email error:', e); }

    return NextResponse.json({ success: true, action: 'accepted' });
  }

  if (action === 'propose') {
    if (!proposed_datetime) {
      return NextResponse.json({ error: 'proposed_datetime is required' }, { status: 400 });
    }

    // Generate customer confirmation token
    const customerToken = crypto.randomBytes(32).toString('hex');

    await supabaseAdmin
      .from('co_bookings')
      .update({
        proposed_datetime,
        confirmation_token: customerToken,
        status: 'pending_scheduling',
        vendor_action_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    // Email customer with accept/refund options
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const respondUrl = `${siteUrl}/booking/respond?token=${customerToken}`;
    const newDate = new Date(proposed_datetime).toLocaleString('en-CA', {
      timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
    });
    const origDate = booking.appointment_datetime
      ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
          timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
        })
      : 'N/A';

    try {
      await sendEmail({
        to: booking.email,
        subject: `New time proposed — ${booking.service_name}`,
        html: `
          <h2>Time Change for Your Booking</h2>
          <p>Hi ${booking.name},</p>
          <p>Your originally requested time (<strong>${origDate}</strong>) for <strong>${booking.service_name}</strong> is no longer available.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>New proposed time:</p>
          <p style="font-size:18px;font-weight:bold;color:#1B3A5C;">${newDate}</p>
          <div style="margin:20px 0;">
            <a href="${respondUrl}&action=accept" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;margin-right:8px;margin-bottom:8px;">Accept New Time</a>
            <a href="${respondUrl}&action=rebook" style="display:inline-block;padding:12px 24px;background:#C8922A;color:white;text-decoration:none;border-radius:6px;margin-right:8px;margin-bottom:8px;">Choose Another Vendor</a>
            <a href="${respondUrl}&action=refund" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;margin-bottom:8px;">Request Refund</a>
          </div>
          <p style="color:#888;font-size:13px;">Your payment will be transferred to the new booking — no need to pay again.</p>
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    } catch (e) { console.error('Propose email error:', e); }

    return NextResponse.json({ success: true, action: 'proposed' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
