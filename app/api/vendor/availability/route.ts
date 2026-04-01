import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const locationId = req.nextUrl.searchParams.get('locationId');

  let query = supabaseAdmin
    .from('co_availability_rules')
    .select('*, location:co_locations(id, name)')
    .eq('commissioner_id', vendor.commissionerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (locationId) query = query.eq('location_id', locationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also return locations for the dropdown
  const { data: locations } = await supabaseAdmin
    .from('co_locations')
    .select('id, name, address')
    .eq('commissioner_id', vendor.commissionerId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return NextResponse.json({ rules: data ?? [], locations: locations ?? [] });
}

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { day_of_week, start_time, end_time, location_id } = body;

  if (!location_id) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert({ commissioner_id: vendor.commissionerId, day_of_week, start_time, end_time, location_id })
    .select()
    .single();

  if (error) {
    // Check for overlap error from trigger
    if (error.message.includes('overlap')) {
      return NextResponse.json({ error: 'Time overlap: you already have availability at another location during this time.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('co_availability_rules')
    .delete()
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
