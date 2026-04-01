import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { proposed_datetime, reason } = body as { proposed_datetime: string; reason?: string };

  if (!proposed_datetime) {
    return NextResponse.json({ error: 'proposed_datetime is required' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Generate a unique confirmation token
  const token = crypto.randomBytes(32).toString('hex');

  await supabaseAdmin
    .from('co_bookings')
    .update({
      proposed_datetime,
      proposed_by: vendor.id,
      confirmation_token: token,
      status: 'pending_scheduling',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Email customer with accept/refund links
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const respondUrl = `${siteUrl}/booking/respond?token=${token}`;
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
      subject: `New time proposed for your booking — ${booking.service_name}`,
      html: `
        <h2>Time Change for Your Booking</h2>
        <p>Hi ${booking.name},</p>
        <p>Unfortunately, your originally requested time (<strong>${origDate}</strong>) is no longer available for <strong>${booking.service_name}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>We'd like to propose a new time:</p>
        <p style="font-size:18px;font-weight:bold;color:#1B3A5C;">${newDate}</p>
        <p>Please choose one of the following options:</p>
        <div style="margin:20px 0;">
          <a href="${respondUrl}&action=accept" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;margin-right:12px;">Accept New Time</a>
          <a href="${respondUrl}&action=refund" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">Request Refund</a>
        </div>
        <p>If you have questions, reply to this email or contact us at info@calgaryoaths.com.</p>
        <p>Thank you,<br/>Calgary Oaths</p>
      `,
    });
  } catch (e) { console.error('Propose email error:', e); }

  return NextResponse.json({ success: true });
}
