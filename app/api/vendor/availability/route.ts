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

  // Blocked dates
  const { data: blockedDates } = await supabaseAdmin
    .from('co_blocked_dates')
    .select('id, blocked_date, reason')
    .eq('commissioner_id', vendor.commissionerId)
    .gte('blocked_date', new Date().toISOString().split('T')[0])
    .order('blocked_date', { ascending: true });

  // Custom times (table may not exist yet if migration hasn't run)
  let customTimes: { id: string; custom_date: string; start_time: string; end_time: string; mode: string; reason: string }[] = [];
  try {
    const { data: ctData, error: ctError } = await supabaseAdmin
      .from('co_custom_times')
      .select('id, custom_date, start_time, end_time, mode, reason')
      .eq('commissioner_id', vendor.commissionerId)
      .gte('custom_date', new Date().toISOString().split('T')[0])
      .order('custom_date', { ascending: true });
    if (!ctError && ctData) customTimes = ctData;
  } catch { /* table may not exist yet */ }

  return NextResponse.json({
    rules: data ?? [],
    locations: locations ?? [],
    blockedDates: blockedDates ?? [],
    customTimes,
  });
}

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Handle blocked date creation
  if (body.type === 'blocked_date') {
    const { dates, reason } = body as { type: string; dates: string[]; reason?: string };
    if (!dates?.length) {
      return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
    }
    const rows = dates.map((d: string) => ({
      commissioner_id: vendor.commissionerId,
      blocked_date: d,
      reason: reason || '',
    }));
    const { data, error } = await supabaseAdmin
      .from('co_blocked_dates')
      .upsert(rows, { onConflict: 'commissioner_id,blocked_date' })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Handle custom time creation (mode: 'add' for extra slots, 'block' to remove time windows)
  if (body.type === 'custom_time') {
    const { custom_date, start_time, end_time, mode, reason } = body as {
      type: string; custom_date: string; start_time: string; end_time: string; mode?: string; reason?: string;
    };
    if (!custom_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('co_custom_times')
        .insert({
          commissioner_id: vendor.commissionerId,
          custom_date,
          start_time,
          end_time,
          mode: mode === 'block' ? 'block' : 'add',
          source: 'manual',
          reason: reason || '',
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    } catch (err) {
      console.error('Custom time insert error:', err);
      return NextResponse.json({ error: 'Failed to create date override. The database migration may need to be applied.' }, { status: 500 });
    }
  }

  // Handle availability rule creation (supports multiple days)
  const { day_of_week, days_of_week, start_time, end_time, location_id } = body;

  if (!location_id) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  // Support single day or multiple days
  const days: number[] = Array.isArray(days_of_week)
    ? days_of_week
    : day_of_week !== undefined
      ? [day_of_week]
      : [];

  if (days.length === 0) {
    return NextResponse.json({ error: 'Missing day_of_week or days_of_week' }, { status: 400 });
  }

  const rows = days.map((d: number) => ({
    commissioner_id: vendor.commissionerId,
    day_of_week: d,
    start_time,
    end_time,
    location_id,
  }));

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert(rows)
    .select();

  if (error) {
    if (error.message.includes('overlap')) {
      return NextResponse.json({ error: 'Time overlap: you already have availability at another location during this time.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data.length === 1 ? data[0] : data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (type === 'blocked_date') {
    const { error } = await supabaseAdmin
      .from('co_blocked_dates')
      .delete()
      .eq('id', id)
      .eq('commissioner_id', vendor.commissionerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === 'custom_time') {
    const { error } = await supabaseAdmin
      .from('co_custom_times')
      .delete()
      .eq('id', id)
      .eq('commissioner_id', vendor.commissionerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin
    .from('co_availability_rules')
    .delete()
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
