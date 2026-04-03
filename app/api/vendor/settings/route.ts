import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('co_commissioners')
    .select('name, title, email, phone, address, location, bio, languages, credentials, mobile_available, virtual_available, mobile_rate_per_km_cents, mobile_minimum_fee_cents, min_booking_buffer_hours, auto_accept_all, free_cancel_hours, request_cancel_hours, gst_registered, gst_number')
    .eq('id', vendor.commissionerId)
    .single();

  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Profile fields
  if (typeof body.email === 'string' && body.email.includes('@')) updates.email = body.email.trim();
  if (typeof body.phone === 'string') updates.phone = body.phone.trim();
  if (typeof body.address === 'string') updates.address = body.address.trim();
  if (typeof body.bio === 'string') updates.bio = body.bio.trim();
  if (Array.isArray(body.languages)) updates.languages = body.languages;

  if (body.mobile_available !== undefined) updates.mobile_available = !!body.mobile_available;
  if (body.virtual_available !== undefined) updates.virtual_available = !!body.virtual_available;
  if (body.mobile_rate_per_km_cents !== undefined) updates.mobile_rate_per_km_cents = Number(body.mobile_rate_per_km_cents);
  if (body.mobile_minimum_fee_cents !== undefined) updates.mobile_minimum_fee_cents = Number(body.mobile_minimum_fee_cents);
  if (body.min_booking_buffer_hours !== undefined) updates.min_booking_buffer_hours = Number(body.min_booking_buffer_hours);
  if (body.auto_accept_all !== undefined) updates.auto_accept_all = !!body.auto_accept_all;
  if (body.gst_registered !== undefined) updates.gst_registered = !!body.gst_registered;
  if (typeof body.gst_number === 'string') updates.gst_number = body.gst_number.trim() || null;

  if (body.free_cancel_hours !== undefined) {
    const val = Number(body.free_cancel_hours);
    if (val >= 1 && val <= 72) updates.free_cancel_hours = val;
  }
  if (body.request_cancel_hours !== undefined) {
    const val = Number(body.request_cancel_hours);
    if (val >= 0 && val <= 48) updates.request_cancel_hours = val;
  }

  const { error } = await supabaseAdmin
    .from('co_commissioners')
    .update(updates)
    .eq('id', vendor.commissionerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
