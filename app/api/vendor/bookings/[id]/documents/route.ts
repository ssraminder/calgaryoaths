import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: bookingId } = await params;

  // Verify booking belongs to this vendor
  const { data: booking } = await supabaseAdmin
    .from('co_bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: docs } = await supabaseAdmin
    .from('co_appointment_documents')
    .select('id, type, file_url, file_name, uploaded_at')
    .eq('booking_id', bookingId)
    .order('uploaded_at', { ascending: true });

  return NextResponse.json({ documents: docs ?? [] });
}
