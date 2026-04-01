import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (!['paid'].includes(booking.status)) {
    return NextResponse.json({ error: 'Can only accept paid bookings' }, { status: 400 });
  }

  await supabaseAdmin
    .from('co_bookings')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id);

  // Get commissioner details for email
  const { data: commDetail } = await supabaseAdmin
    .from('co_commissioners')
    .select('address, phone')
    .eq('id', vendor.commissionerId)
    .single();

  const apptDate = new Date(booking.appointment_datetime).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
  });
  const isMobile = booking.delivery_mode === 'mobile';

  try {
    await sendEmail({
      to: booking.email,
      subject: `Booking confirmed — ${booking.service_name}`,
      html: `
        <h2>Your Booking is Confirmed!</h2>
        <p>Hi ${booking.name},</p>
        <p>Your appointment for <strong>${booking.service_name}</strong> has been confirmed.</p>
        <p><strong>Date & Time:</strong> ${apptDate}</p>
        <p><strong>Commissioner:</strong> ${vendor.commissionerName}</p>
        ${isMobile
          ? `<p><strong>Location:</strong> Mobile — we will come to: ${booking.customer_address || 'your location'}</p>`
          : `<p><strong>Location:</strong> ${commDetail?.address || 'See confirmation details'}</p>`
        }
        <p><strong>Phone:</strong> ${commDetail?.phone || '(587) 600-0746'}</p>
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
  } catch (e) { console.error('Confirm email error:', e); }

  return NextResponse.json({ success: true });
}
