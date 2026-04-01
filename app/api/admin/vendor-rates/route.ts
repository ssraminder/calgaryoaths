import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/vendor-rates?commissionerId=xxx
 *   Returns all vendor rates for a commissioner with suggested rates.
 *   Suggested rate = company rate minus 20%, rounded to nearest $5.
 *
 * POST /api/admin/vendor-rates
 *   Upserts vendor rates + service assignments for a commissioner.
 */

const ADDITIONAL_PAGE_COMPANY_CENTS = 2000; // $20 company rate for additional pages

/** Round cents to the nearest $5 (500 cents) */
function roundToNearest5(cents: number): number {
  return Math.round(cents / 500) * 500;
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commissionerId = req.nextUrl.searchParams.get('commissionerId');
  if (!commissionerId) {
    return NextResponse.json({ error: 'Missing commissionerId' }, { status: 400 });
  }

  // Fetch existing vendor rates
  const { data: rates } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('*')
    .eq('commissioner_id', commissionerId);

  // Fetch all active services for context
  const { data: services } = await supabaseAdmin
    .from('co_services')
    .select('slug, name, price, price_label')
    .eq('active', true)
    .order('display_order', { ascending: true });

  // Fetch which services this commissioner offers
  const { data: links } = await supabaseAdmin
    .from('co_commissioner_services')
    .select('service_slug')
    .eq('commissioner_id', commissionerId);

  const offeredSlugs = new Set((links ?? []).map((l) => l.service_slug));
  const rateMap = new Map((rates ?? []).map((r) => [r.service_slug, r]));

  // Build merged list: one entry per ALL active services, with offered flag
  const merged = (services ?? []).map((s) => {
    const existing = rateMap.get(s.slug);
    const offered = offeredSlugs.has(s.slug);

    // Suggested = company rate - 20%, rounded to nearest $5
    const suggestedFirst = s.price != null ? roundToNearest5(s.price * 0.8) : null;
    const suggestedAdditional = roundToNearest5(ADDITIONAL_PAGE_COMPANY_CENTS * 0.8);

    return {
      service_slug: s.slug,
      service_name: s.name,
      service_price: s.price,
      service_price_label: s.price_label,
      suggested_first_page_cents: suggestedFirst,
      suggested_additional_page_cents: suggestedAdditional,
      first_page_cents: existing?.first_page_cents ?? suggestedFirst,
      additional_page_cents: existing?.additional_page_cents ?? suggestedAdditional,
      drafting_fee_cents: existing?.drafting_fee_cents ?? 0,
      is_saved: !!existing,
      is_default: !existing,
      offered,
    };
  });

  return NextResponse.json({ rates: merged });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { commissionerId, rates } = (await req.json()) as {
    commissionerId: string;
    rates: {
      service_slug: string;
      first_page_cents: number | null;
      additional_page_cents?: number;
      drafting_fee_cents?: number;
      offered: boolean;
    }[];
  };

  if (!commissionerId || !Array.isArray(rates)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const results: { slug: string; ok: boolean; error?: string }[] = [];

  // Sync service assignments: rebuild co_commissioner_services
  const offeredSlugs = rates.filter((r) => r.offered).map((r) => r.service_slug);
  await supabaseAdmin.from('co_commissioner_services').delete().eq('commissioner_id', commissionerId);
  if (offeredSlugs.length > 0) {
    await supabaseAdmin.from('co_commissioner_services').insert(
      offeredSlugs.map((slug) => ({ commissioner_id: commissionerId, service_slug: slug }))
    );
  }

  // Upsert vendor rates for offered services
  for (const rate of rates) {
    if (!rate.service_slug || !rate.offered || rate.first_page_cents == null) continue;

    const { data: existing } = await supabaseAdmin
      .from('co_vendor_rates')
      .select('id')
      .eq('commissioner_id', commissionerId)
      .eq('service_slug', rate.service_slug)
      .single();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('co_vendor_rates')
        .update({
          first_page_cents: rate.first_page_cents,
          additional_page_cents: rate.additional_page_cents ?? 1500,
          drafting_fee_cents: rate.drafting_fee_cents ?? 0,
        })
        .eq('id', existing.id);
      results.push({ slug: rate.service_slug, ok: !error, error: error?.message });
    } else {
      const { error } = await supabaseAdmin
        .from('co_vendor_rates')
        .insert({
          commissioner_id: commissionerId,
          service_slug: rate.service_slug,
          first_page_cents: rate.first_page_cents,
          additional_page_cents: rate.additional_page_cents ?? 1500,
          drafting_fee_cents: rate.drafting_fee_cents ?? 0,
        });
      results.push({ slug: rate.service_slug, ok: !error, error: error?.message });
    }
  }

  // Clean up vendor rates for services no longer offered
  const notOfferedSlugs = rates.filter((r) => !r.offered).map((r) => r.service_slug);
  if (notOfferedSlugs.length > 0) {
    await supabaseAdmin
      .from('co_vendor_rates')
      .delete()
      .eq('commissioner_id', commissionerId)
      .in('service_slug', notOfferedSlugs);
  }

  return NextResponse.json({ results });
}
