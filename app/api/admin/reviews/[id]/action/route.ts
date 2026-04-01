import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, reason } = body as { action: string; reason?: string };

  if (!['approved', 'rejected', 'info_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch booking
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Create audit record
  await supabaseAdmin.from('co_review_actions').insert({
    booking_id: id,
    action,
    admin_user_id: user.id,
    reason: reason || null,
  });

  // Update booking status
  let newStatus = booking.status;
  if (action === 'approved') newStatus = 'pending_scheduling';
  if (action === 'rejected') newStatus = 'rejected';
  // info_requested keeps status as pending_review

  await supabaseAdmin
    .from('co_bookings')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Send email to customer
  try {
    if (action === 'approved') {
      await sendEmail({
        to: booking.email,
        subject: `Your booking has been approved — ${booking.service_name}`,
        html: `
          <h2>Booking Approved</h2>
          <p>Hi ${booking.name},</p>
          <p>Your booking for <strong>${booking.service_name}</strong> has been reviewed and approved.</p>
          <p>You can now proceed to select a time slot and complete your booking deposit.</p>
          <p>If you have any questions, please reply to this email or contact us at info@calgaryoaths.com.</p>
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    } else if (action === 'rejected') {
      await sendEmail({
        to: booking.email,
        subject: `Update on your booking request — ${booking.service_name}`,
        html: `
          <h2>Booking Update</h2>
          <p>Hi ${booking.name},</p>
          <p>Unfortunately, we are unable to proceed with your booking for <strong>${booking.service_name}</strong> at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you have questions or believe this is an error, please contact us at info@calgaryoaths.com.</p>
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    } else if (action === 'info_requested') {
      await sendEmail({
        to: booking.email,
        subject: `Additional information needed — ${booking.service_name}`,
        html: `
          <h2>Information Needed</h2>
          <p>Hi ${booking.name},</p>
          <p>We need a bit more information before we can proceed with your booking for <strong>${booking.service_name}</strong>.</p>
          ${reason ? `<p><strong>Details:</strong> ${reason}</p>` : ''}
          <p>Please reply to this email with the requested information, or contact us at info@calgaryoaths.com.</p>
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    }
  } catch (emailErr) {
    console.error('Review action email error:', emailErr);
    // Don't fail the action if email fails
  }

  return NextResponse.json({ success: true, newStatus });
}
