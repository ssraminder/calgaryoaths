import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commissionerId = req.nextUrl.searchParams.get('commissionerId');
  if (!commissionerId) return NextResponse.json({ error: 'Missing commissionerId' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const body = await req.json();
  const { commissioner_id, day_of_week, start_time, end_time } = body;

  if (!commissioner_id || day_of_week === undefined || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert({ commissioner_id, day_of_week, start_time, end_time })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
