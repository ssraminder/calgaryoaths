import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { decision } = await req.json();

  if (!['approve', 'deny'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (booking.status !== 'pending_cancellation') {
    return NextResponse.json({ error: 'Booking is not pending cancellation' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (decision === 'approve') {
    // Issue refund
    let refundId: string | null = null;
    if (booking.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
        });
        refundId = refund.id;
      } catch (e) {
        console.error('Stripe refund error during cancel approval:', e);
      }
    }

    await supabaseAdmin
      .from('co_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        cancelled_reason: 'Cancellation approved by vendor',
        cancellation_decided_by: vendor.commissionerId,
        cancellation_decided_at: now,
        cancel_token: null,
        updated_at: now,
      })
      .eq('id', id);

    // Notify customer
    try {
      await sendEmail({
        to: booking.email,
        subject: `Cancellation approved — ${booking.service_name}`,
        html: `
          <h2>Your Cancellation Has Been Approved</h2>
          <p>Hi ${booking.name},</p>
          <p>Your cancellation request for <strong>${booking.service_name}</strong> has been approved.</p>
          ${refundId ? '<p>A full refund has been issued to your original payment method. Please allow 5–10 business days for the refund to appear.</p>' : '<p>A refund will be processed shortly.</p>'}
          <p>Thank you,<br/>Calgary Oaths</p>
        `,
      });
    } catch (e) { console.error('Cancel approval email error:', e); }

    return NextResponse.json({ success: true, decision: 'approve', refundId });
  }

  // decision === 'deny'
  // Restore booking to its previous status (confirmed or paid)
  await supabaseAdmin
    .from('co_bookings')
    .update({
      status: booking.appointment_datetime ? 'confirmed' : 'paid',
      cancellation_decided_by: vendor.commissionerId,
      cancellation_decided_at: now,
      cancelled_reason: 'Cancellation denied by vendor',
      updated_at: now,
    })
    .eq('id', id);

  // Notify customer
  try {
    const apptDate = booking.appointment_datetime
      ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
          timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short',
        })
      : '';
    await sendEmail({
      to: booking.email,
      subject: `Cancellation request denied — ${booking.service_name}`,
      html: `
        <h2>Cancellation Request Denied</h2>
        <p>Hi ${booking.name},</p>
        <p>Your cancellation request for <strong>${booking.service_name}</strong> could not be approved as it was within the cancellation policy window.</p>
        <p>Your appointment${apptDate ? ` on <strong>${apptDate}</strong>` : ''} remains confirmed. Please make sure to attend as scheduled.</p>
        <p>If you have questions, contact us at <a href="mailto:info@calgaryoaths.com">info@calgaryoaths.com</a> or call <a href="tel:5876000746">(587) 600-0746</a>.</p>
        <p>Thank you,<br/>Calgary Oaths</p>
      `,
    });
  } catch (e) { console.error('Cancel denial email error:', e); }

  return NextResponse.json({ success: true, decision: 'deny' });
}
