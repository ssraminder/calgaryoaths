import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commissionerId = req.nextUrl.searchParams.get('commissionerId');
  const locationId = req.nextUrl.searchParams.get('locationId');
  if (!commissionerId) return NextResponse.json({ error: 'Missing commissionerId' }, { status: 400 });

  let query = supabaseAdmin
    .from('co_availability_rules')
    .select('*, location:co_locations(id, name)')
    .eq('commissioner_id', commissionerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (locationId) query = query.eq('location_id', locationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also return locations for the dropdown
  const { data: locations } = await supabaseAdmin
    .from('co_locations')
    .select('id, name, address')
    .eq('commissioner_id', commissionerId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return NextResponse.json({ rules: data ?? [], locations: locations ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const body = await req.json();
  const { commissioner_id, day_of_week, start_time, end_time, location_id } = body;

  if (!commissioner_id || day_of_week === undefined || !start_time || !end_time || !location_id) {
    return NextResponse.json({ error: 'Missing required fields (including location_id)' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert({ commissioner_id, day_of_week, start_time, end_time, location_id })
    .select()
    .single();

  if (error) {
    if (error.message.includes('overlap')) {
      return NextResponse.json({ error: 'Time overlap: commissioner already has availability at another location during this time.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabaseAdmin.from('co_availability_rules').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
