import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('co_commissioners')
    .select('mobile_available, virtual_available, mobile_rate_per_km_cents, mobile_minimum_fee_cents')
    .eq('id', vendor.commissionerId)
    .single();

  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.mobile_available !== undefined) updates.mobile_available = !!body.mobile_available;
  if (body.virtual_available !== undefined) updates.virtual_available = !!body.virtual_available;
  if (body.mobile_rate_per_km_cents !== undefined) updates.mobile_rate_per_km_cents = Number(body.mobile_rate_per_km_cents);
  if (body.mobile_minimum_fee_cents !== undefined) updates.mobile_minimum_fee_cents = Number(body.mobile_minimum_fee_cents);

  const { error } = await supabaseAdmin
    .from('co_commissioners')
    .update(updates)
    .eq('id', vendor.commissionerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
