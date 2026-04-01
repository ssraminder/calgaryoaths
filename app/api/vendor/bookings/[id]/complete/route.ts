import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: bookingId } = await params;
  const body = await req.json().catch(() => ({}));

  // Verify booking belongs to this vendor and is in a completable state
  const { data: booking } = await supabaseAdmin
    .from('co_bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (!['confirmed', 'paid'].includes(booking.status)) {
    return NextResponse.json({
      error: `Cannot complete a booking with status "${booking.status}". Must be confirmed or paid.`,
    }, { status: 400 });
  }

  // Verify required uploads exist
  const { data: docs } = await supabaseAdmin
    .from('co_appointment_documents')
    .select('type')
    .eq('booking_id', bookingId);

  const types = new Set((docs ?? []).map((d) => d.type));
  if (!types.has('customer_id')) {
    return NextResponse.json({ error: 'Upload at least one customer ID before marking complete.' }, { status: 400 });
  }
  if (!types.has('commissioned_document')) {
    return NextResponse.json({ error: 'Upload at least one commissioned document before marking complete.' }, { status: 400 });
  }

  // Mark as completed
  const { error } = await supabaseAdmin
    .from('co_bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_notes: body.notes || null,
      payout_status: 'eligible',
    })
    .eq('id', bookingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: 'completed', payout_status: 'eligible' });
}
