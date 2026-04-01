import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .select('*')
    .eq('commissioner_id', vendor.commissionerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { day_of_week, start_time, end_time } = body;

  const { data, error } = await supabaseAdmin
    .from('co_availability_rules')
    .insert({ commissioner_id: vendor.commissionerId, day_of_week, start_time, end_time })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Ensure the rule belongs to this vendor
  const { error } = await supabaseAdmin
    .from('co_availability_rules')
    .delete()
    .eq('id', id)
    .eq('commissioner_id', vendor.commissionerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
