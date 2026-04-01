import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-server';

async function getAuthUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayBookings, pendingReviews, monthlyRevenue, monthlyBookings, recentBookings] =
    await Promise.all([
      // Today's bookings
      supabaseAdmin
        .from('co_bookings')
        .select('id', { count: 'exact', head: true })
        .gte('appointment_datetime', todayStart)
        .lt('appointment_datetime', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()),

      // Pending reviews
      supabaseAdmin
        .from('co_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),

      // Monthly revenue (sum of amount_paid)
      supabaseAdmin
        .from('co_bookings')
        .select('amount_paid')
        .gte('created_at', monthStart)
        .not('amount_paid', 'is', null),

      // Monthly bookings count
      supabaseAdmin
        .from('co_bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart),

      // Recent 10 bookings
      supabaseAdmin
        .from('co_bookings')
        .select('id, name, email, service_name, commissioner_id, appointment_datetime, status, amount_paid, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  const revenueSum = (monthlyRevenue.data ?? []).reduce(
    (sum, row) => sum + (row.amount_paid || 0),
    0
  );

  return NextResponse.json({
    todayBookings: todayBookings.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
    monthlyRevenue: revenueSum,
    monthlyBookings: monthlyBookings.count ?? 0,
    recentBookings: recentBookings.data ?? [],
  });
}
