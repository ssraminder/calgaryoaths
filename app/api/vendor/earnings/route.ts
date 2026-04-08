import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

// TODO: Enable RLS on co_bookings and co_payout_batches before go-live.
// Currently queries use service role key which bypasses RLS, but the
// commissioner_id filter ensures vendors only see their own data.

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cid = vendor.commissionerId;
  const url = req.nextUrl.searchParams;
  const batchId = url.get('batch_id'); // optional: fetch bookings for a specific batch

  // If batch_id is provided, return bookings for that batch
  if (batchId) {
    const { data, error } = await supabaseAdmin
      .from('co_bookings')
      .select('id, service_name, appointment_datetime, delivery_mode, total_charged_cents, platform_fee_cents, travel_fee_cents, vendor_payout_cents, vendor_gst_cents, vendor_total_payout_cents, completed_at')
      .eq('commissioner_id', cid)
      .eq('payout_batch_id', batchId)
      .order('completed_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ batch_bookings: data ?? [] });
  }

  // Fetch commissioner GST status
  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('gst_registered, commission_rate')
    .eq('id', cid)
    .single();

  // --- Summary queries (run in parallel) ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [pendingRes, lastPaidRes, totalEarnedRes, monthCountRes, batchesRes, pendingBookingsRes] =
    await Promise.all([
      // Next payout: sum of pending + batched
      supabaseAdmin
        .from('co_bookings')
        .select('vendor_total_payout_cents')
        .eq('commissioner_id', cid)
        .in('payout_status', ['pending', 'batched']),

      // Last paid batch
      supabaseAdmin
        .from('co_payout_batches')
        .select('total_with_gst_cents, paid_at, total_cents, gst_cents')
        .eq('commissioner_id', cid)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1),

      // Total earned (all time, paid only)
      supabaseAdmin
        .from('co_bookings')
        .select('vendor_total_payout_cents')
        .eq('commissioner_id', cid)
        .eq('payout_status', 'paid'),

      // Bookings this month (completed)
      supabaseAdmin
        .from('co_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('commissioner_id', cid)
        .eq('status', 'completed')
        .gte('completed_at', monthStart),

      // Payout batches (all, newest first)
      supabaseAdmin
        .from('co_payout_batches')
        .select('id, period_start, period_end, booking_count, total_cents, gst_cents, total_with_gst_cents, status, payment_method, payment_reference, paid_at')
        .eq('commissioner_id', cid)
        .order('period_end', { ascending: false }),

      // Pending bookings (not yet batched)
      supabaseAdmin
        .from('co_bookings')
        .select('id, service_name, appointment_datetime, delivery_mode, total_charged_cents, platform_fee_cents, travel_fee_cents, vendor_payout_cents, vendor_gst_cents, vendor_total_payout_cents, completed_at')
        .eq('commissioner_id', cid)
        .eq('payout_status', 'pending')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false }),
    ]);

  // Sum helper
  const sumCents = (rows: { vendor_total_payout_cents: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.vendor_total_payout_cents ?? 0), 0);

  const summary = {
    next_payout_cents: sumCents(pendingRes.data),
    last_paid_cents: lastPaidRes.data?.[0]?.total_with_gst_cents ?? 0,
    last_paid_at: lastPaidRes.data?.[0]?.paid_at ?? null,
    total_earned_cents: sumCents(totalEarnedRes.data),
    bookings_this_month: monthCountRes.count ?? 0,
    gst_registered: commissioner?.gst_registered ?? false,
    commission_rate: commissioner?.commission_rate ?? 20,
  };

  return NextResponse.json({
    summary,
    batches: batchesRes.data ?? [],
    pending_bookings: pendingBookingsRes.data ?? [],
  });
}
