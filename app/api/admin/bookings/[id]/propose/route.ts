import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { proposed_datetime, reason } = body as { proposed_datetime: string; reason?: string };

  if (!proposed_datetime) return NextResponse.json({ error: 'proposed_datetime required' }, { status: 400 });

  const { data: booking, error } = await supabaseAdmin.from('co_bookings').select('*').eq('id', id).single();
  if (error || !booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = crypto.randomBytes(32).toString('hex');

  await supabaseAdmin.from('co_bookings').update({
    proposed_datetime, proposed_by: user.id, confirmation_token: token,
    status: 'pending_scheduling', updated_at: new Date().toISOString(),
  }).eq('id', id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const respondUrl = `${siteUrl}/booking/respond?token=${token}`;
  const newDate = new Date(proposed_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' });
  const origDate = booking.appointment_datetime
    ? new Date(booking.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' }) : 'N/A';

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
        </div>
        <p>Thank you,<br/>Calgary Oaths</p>
      `,
    });
  } catch (e) { console.error('Propose email error:', e); }

  return NextResponse.json({ success: true });
}
