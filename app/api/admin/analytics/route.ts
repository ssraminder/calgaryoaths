import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams;
  const dateFrom = url.get('dateFrom') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const dateTo = url.get('dateTo') || new Date().toISOString().slice(0, 10);
  const commissioner = url.get('commissioner') || '';
  const service = url.get('service') || '';

  let query = supabaseAdmin
    .from('co_bookings')
    .select('id, status, service_slug, service_name, commissioner_id, amount_paid, created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59.999Z');

  if (commissioner) query = query.eq('commissioner_id', commissioner);
  if (service) query = query.eq('service_slug', service);

  const { data: bookings, error } = await query.order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = bookings ?? [];

  // Bookings over time (daily)
  const dailyMap: Record<string, { date: string; count: number; revenue: number }> = {};
  for (const b of rows) {
    const day = b.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { date: day, count: 0, revenue: 0 };
    dailyMap[day].count++;
    dailyMap[day].revenue += b.amount_paid || 0;
  }
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // By service
  const byService: Record<string, number> = {};
  for (const b of rows) {
    byService[b.service_name] = (byService[b.service_name] || 0) + 1;
  }

  // By commissioner
  const byCommissioner: Record<string, number> = {};
  for (const b of rows) {
    byCommissioner[b.commissioner_id] = (byCommissioner[b.commissioner_id] || 0) + 1;
  }

  // Conversion funnel
  const total = rows.length;
  const paid = rows.filter((b) => ['paid', 'confirmed', 'completed'].includes(b.status)).length;
  const confirmed = rows.filter((b) => ['confirmed', 'completed'].includes(b.status)).length;

  return NextResponse.json({
    daily,
    byService: Object.entries(byService).map(([name, value]) => ({ name, value })),
    byCommissioner: Object.entries(byCommissioner).map(([name, value]) => ({ name, value })),
    funnel: { total, paid, confirmed },
  });
}
