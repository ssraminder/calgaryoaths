import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { calendarLinksHtml } from '@/lib/calendar';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin.from('co_bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', id);

  const { data: commDetail } = await supabaseAdmin
    .from('co_commissioners')
    .select('name, address, phone')
    .eq('id', booking.commissioner_id)
    .single();

  const apptDate = booking.appointment_datetime
    ? new Date(booking.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' })
    : '';
  const isMobile = booking.delivery_mode === 'mobile';

  const locationText = isMobile
    ? booking.customer_address || 'Mobile service'
    : commDetail?.address || 'Calgary, AB';

  const calHtml = booking.appointment_datetime
    ? calendarLinksHtml({
        title: `${booking.service_name} — Calgary Oaths`,
        description: `Commissioner: ${commDetail?.name || ''}\nPhone: ${commDetail?.phone || '(587) 600-0746'}`,
        location: locationText,
        startTime: booking.appointment_datetime,
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
        <p><strong>Commissioner:</strong> ${commDetail?.name || ''}</p>
        <p><strong>Location:</strong> ${isMobile ? `Mobile — we will come to: ${booking.customer_address || 'your location'}` : commDetail?.address || ''}</p>
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
  } catch (e) { console.error('Accept email error:', e); }

  return NextResponse.json({ success: true });
}
