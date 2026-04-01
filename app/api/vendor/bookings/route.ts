import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams;
  const status = url.get('status') || '';

  let query = supabaseAdmin
    .from('co_bookings')
    .select('id, name, email, phone, service_name, appointment_datetime, proposed_datetime, status, vendor_payout_cents, vendor_gst_cents, vendor_total_payout_cents, notes, num_documents, delivery_mode, customer_address, facility_name, created_at')
    .eq('commissioner_id', vendor.commissionerId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
