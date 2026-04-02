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

  // Blocked dates
  const { data: blockedDates } = await supabaseAdmin
    .from('co_blocked_dates')
    .select('id, blocked_date, reason')
    .eq('commissioner_id', commissionerId)
    .gte('blocked_date', new Date().toISOString().split('T')[0])
    .order('blocked_date', { ascending: true });

  // Custom times
  const { data: customTimes } = await supabaseAdmin
    .from('co_custom_times')
    .select('id, custom_date, start_time, end_time, mode, reason')
    .eq('commissioner_id', commissionerId)
    .gte('custom_date', new Date().toISOString().split('T')[0])
    .order('custom_date', { ascending: true });

  return NextResponse.json({ rules: data ?? [], locations: locations ?? [], blockedDates: blockedDates ?? [], customTimes: customTimes ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const body = await req.json();

  // Handle custom time creation (mode: 'add' for extra slots, 'block' to remove time windows)
  if (body.type === 'custom_time') {
    const { commissioner_id, custom_date, start_time, end_time, mode, reason, location_id } = body as {
      type: string; commissioner_id: string; custom_date: string; start_time: string; end_time: string; mode?: string; reason?: string; location_id?: string;
    };
    if (!commissioner_id || !custom_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('co_custom_times')
      .insert({
        commissioner_id,
        custom_date,
        start_time,
        end_time,
        mode: mode === 'block' ? 'block' : 'add',
        source: 'manual',
        reason: reason || '',
        location_id: location_id || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Handle blocked date creation
  if (body.type === 'blocked_date') {
    const { commissioner_id, dates, reason } = body as {
      type: string; commissioner_id: string; dates: string[]; reason?: string;
    };
    if (!commissioner_id || !dates?.length) {
      return NextResponse.json({ error: 'Missing commissioner_id or dates' }, { status: 400 });
    }
    const rows = dates.map((d: string) => ({
      commissioner_id,
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

  const { commissioner_id, day_of_week, days_of_week, start_time, end_time, location_id } = body;

  if (!commissioner_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

  // Auto-resolve location_id if not provided
  let resolvedLocationId = location_id;
  if (!resolvedLocationId) {
    const { data: locs } = await supabaseAdmin
      .from('co_locations')
      .select('id')
      .eq('commissioner_id', commissioner_id)
      .eq('active', true)
      .limit(1);
    resolvedLocationId = locs?.[0]?.id ?? null;
  }

  if (!resolvedLocationId) {
    return NextResponse.json({ error: 'No active location found for this commissioner' }, { status: 400 });
  }

  // Insert one rule per day
  const rows = days.map((d: number) => ({
    commissioner_id,
    day_of_week: d,
    start_time,
    end_time,
    location_id: resolvedLocationId,
  }));

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert(rows)
    .select();

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
  const type = req.nextUrl.searchParams.get('type');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (type === 'blocked_date') {
    const { error } = await supabaseAdmin.from('co_blocked_dates').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === 'custom_time') {
    const { error } = await supabaseAdmin.from('co_custom_times').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin.from('co_availability_rules').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
