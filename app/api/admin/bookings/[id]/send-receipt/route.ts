import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { buildBookingReceiptPdf, receiptNumber, fetchReceiptLogo } from '@/lib/bookings/receipt-pdf';

// POST — email the booking receipt PDF to the customer.
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

  if (!booking.email) {
    return NextResponse.json({ error: 'Booking has no customer email on file' }, { status: 400 });
  }
  if (booking.amount_paid == null) {
    return NextResponse.json({ error: 'No payment on file for this booking' }, { status: 400 });
  }

  const { data: commissioner } = booking.commissioner_id
    ? await supabaseAdmin
        .from('co_commissioners')
        .select('name, address, gst_number')
        .eq('id', booking.commissioner_id)
        .single()
    : { data: null };

  const logo = await fetchReceiptLogo();

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildBookingReceiptPdf(booking, commissioner, logo);
  } catch (err) {
    console.error('Booking receipt PDF generation failed', err);
    return NextResponse.json({ error: 'Failed to generate receipt PDF' }, { status: 500 });
  }

  const recNum = receiptNumber(booking.id);
  const filename = `${recNum}.pdf`;
  const greetingName = booking.name || 'there';
  const amount = `$${((booking.amount_paid || 0) / 100).toFixed(2)}`;
  const subject = `Your Calgary Oaths receipt (${recNum})`;

  try {
    await sendEmail({
      to: booking.email,
      subject,
      replyTo: 'info@calgaryoaths.com',
      html: `
        <p>Hi ${greetingName},</p>
        <p>Thank you for booking with Calgary Oaths. Your receipt for <strong>${booking.service_name || 'your appointment'}</strong> is attached for your records.</p>
        <p>Receipt #: <strong>${recNum}</strong><br/>Amount paid: <strong>${amount} CAD</strong></p>
        <p>If you have any questions, just reply to this email.</p>
        <p>- Calgary Oaths<br/>(587) 600-0746 . info@calgaryoaths.com</p>
      `,
      attachments: [{ name: filename, content: Buffer.from(pdfBytes) }],
    });
  } catch (err) {
    console.error('Receipt email send failed', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent_to: booking.email, receipt: recNum });
}
