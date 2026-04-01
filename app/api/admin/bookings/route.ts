import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(url.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  // Filters
  const statuses = url.get('status')?.split(',').filter(Boolean) || [];
  const commissioner = url.get('commissioner') || '';
  const service = url.get('service') || '';
  const search = url.get('search') || '';
  const dateFrom = url.get('dateFrom') || '';
  const dateTo = url.get('dateTo') || '';

  let query = supabaseAdmin
    .from('co_bookings')
    .select('id, name, email, phone, service_slug, service_name, commissioner_id, appointment_datetime, status, amount_paid, created_at, admin_notes, notes, num_documents, requires_review, stripe_session_id, stripe_payment_intent_id, cancelled_at, cancelled_reason', { count: 'exact' });

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }
  if (commissioner) {
    query = query.eq('commissioner_id', commissioner);
  }
  if (service) {
    query = query.eq('service_slug', service);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bookings: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
