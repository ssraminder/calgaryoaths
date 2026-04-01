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

  // Verify booking belongs to this vendor
  const { data: booking } = await supabaseAdmin
    .from('co_bookings')
    .select('id, commissioner_id')
    .eq('id', bookingId)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string;

  if (!file || !type || !['customer_id', 'commissioned_document'].includes(type)) {
    return NextResponse.json({ error: 'Missing file or invalid type' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${bookingId}/${type}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('appointment-documents')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get signed URL (valid 90 days)
  const { data: urlData } = await supabaseAdmin.storage
    .from('appointment-documents')
    .createSignedUrl(path, 90 * 24 * 60 * 60);

  const fileUrl = urlData?.signedUrl || path;

  // Create document record
  const { data: doc, error: dbError } = await supabaseAdmin
    .from('co_appointment_documents')
    .insert({
      booking_id: bookingId,
      commissioner_id: vendor.commissionerId,
      type,
      file_url: fileUrl,
      file_name: file.name,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: bookingId } = await params;
  const docId = req.nextUrl.searchParams.get('docId');
  if (!docId) return NextResponse.json({ error: 'Missing docId' }, { status: 400 });

  // Verify doc belongs to this vendor's booking
  const { data: doc } = await supabaseAdmin
    .from('co_appointment_documents')
    .select('id, file_url')
    .eq('id', docId)
    .eq('booking_id', bookingId)
    .eq('commissioner_id', vendor.commissionerId)
    .single();

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  await supabaseAdmin.from('co_appointment_documents').delete().eq('id', docId);

  return NextResponse.json({ success: true });
}
