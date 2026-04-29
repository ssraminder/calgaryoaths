import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { generateOrderNumber } from '@/lib/orders/order-number';
import { newOrderSchema } from '@/lib/orders/schema';

export async function POST(req: NextRequest) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = newOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { order_type } = parsed.data;
  let order_number: string;
  try {
    order_number = await generateOrderNumber(order_type);
  } catch (err) {
    console.error('Order number error', err);
    return NextResponse.json({ error: 'Failed to generate order number' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('co_orders')
    .insert({
      order_type,
      order_number,
      status: 'draft',
      staff_user_id: staff.id,
    })
    .select('id, order_number, order_type, status')
    .single();

  if (error || !data) {
    console.error('Order create error', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('q');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  let q = supabaseAdmin
    .from('co_orders')
    .select('id, order_number, order_type, status, customer_name, customer_email, total_cents, created_at, paid_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('order_type', type);
  if (status) q = q.eq('status', status);
  if (search) q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}
