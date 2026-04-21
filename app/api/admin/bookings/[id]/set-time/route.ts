import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { calendarLinksHtml, locationHtml } from '@/lib/calendar';
import { pushBookingToCalendars } from '@/lib/calendar-sync';

const ALLOWED_STATUSES = ['paid', 'pending_scheduling', 'confirmed'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { appointment_datetime } = body as { appointment_datetime: string };

  if (!appointment_datetime) {
    return NextResponse.json({ error: 'appointment_datetime required' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!ALLOWED_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot set time on booking with status ${booking.status}` },
      { status: 400 }
    );
  }

  const wasRescheduled = !!booking.appointment_datetime
    && new Date(booking.appointment_datetime).getTime() !== new Date(appointment_datetime).getTime();

  await supabaseAdmin
    .from('co_bookings')
    .update({
      appointment_datetime,
      proposed_datetime: null,
      proposed_by: null,
      confirmation_token: null,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  const { data: commDetail } = await supabaseAdmin
    .from('co_commissioners')
    .select('name, address, phone')
    .eq('id', booking.commissioner_id)
    .single();

  const apptDate = new Date(appointment_datetime).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
  });
  const isMobile = booking.delivery_mode === 'mobile';

  const locationText = isMobile
    ? booking.customer_address || 'Mobile service'
    : commDetail?.address || 'Calgary, AB';

  const calHtml = calendarLinksHtml({
    title: `${booking.service_name} — Calgary Oaths`,
    description: `Commissioner: ${commDetail?.name || ''}\nPhone: ${commDetail?.phone || '(587) 600-0746'}`,
    location: locationText,
    startTime: appointment_datetime,
  });

  const heading = wasRescheduled ? 'Your Booking Has Been Rescheduled' : 'Your Booking is Confirmed!';
  const lede = wasRescheduled
    ? `Your appointment for <strong>${booking.service_name}</strong> has been rescheduled and is confirmed for the new time below.`
    : `Your appointment for <strong>${booking.service_name}</strong> has been confirmed.`;
  const subject = wasRescheduled
    ? `Booking rescheduled — ${booking.service_name}`
    : `Booking confirmed — ${booking.service_name}`;

  try {
    await sendEmail({
      to: booking.email,
      subject,
      html: `
        <h2>${heading}</h2>
        <p>Hi ${booking.name},</p>
        <p>${lede}</p>
        <p><strong>Date & Time:</strong> ${apptDate}</p>
        <p><strong>Commissioner:</strong> ${commDetail?.name || ''}</p>
        ${locationHtml(commDetail?.address || 'Calgary, AB', isMobile, booking.customer_address)}
        <p><strong>Phone:</strong> ${commDetail?.phone || '(587) 600-0746'}</p>
        ${calHtml}
        <h3>What to bring:</h3>
        <ul>
          <li>Valid government-issued photo ID</li>
          <li>Your documents (unsigned)</li>
          <li>Any supporting materials</li>
        </ul>
        <p><strong>Important:</strong> Do NOT sign your documents before the appointment.</p>
        <p>If you need to make changes, please contact us at info@calgaryoaths.com.</p>
        <p>Thank you,<br/>Calgary Oaths</p>
      `,
    });
  } catch (e) { console.error('Set-time email error:', e); }

  if (booking.commissioner_id) {
    try {
      const apptStart = new Date(appointment_datetime);
      const apptEnd = new Date(apptStart.getTime() + 30 * 60 * 1000);
      await pushBookingToCalendars(booking.commissioner_id, {
        title: `${booking.service_name} — ${booking.name}`,
        description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}${booking.notes ? `\nNotes: ${booking.notes}` : ''}`,
        location: locationText,
        startTime: apptStart.toISOString(),
        endTime: apptEnd.toISOString(),
      });
    } catch (calErr) {
      console.error('Calendar push error (non-blocking):', calErr);
    }
  }

  return NextResponse.json({ success: true, rescheduled: wasRescheduled });
}
