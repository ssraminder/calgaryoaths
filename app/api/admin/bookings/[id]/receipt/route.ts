import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { buildBookingReceiptPdf, receiptNumber } from '@/lib/bookings/receipt-pdf';

// GET — stream the booking receipt PDF (inline in the browser / for download).
export async function GET(
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

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildBookingReceiptPdf(booking, commissioner);
  } catch (err) {
    console.error('Booking receipt PDF generation failed', err);
    return NextResponse.json({ error: 'Failed to generate receipt PDF' }, { status: 500 });
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${receiptNumber(booking.id)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
