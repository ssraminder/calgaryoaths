import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const ADDITIONAL_PAGE_COMPANY_CENTS = 2000;

function roundToNearest5(cents: number): number {
  return Math.round(cents / 500) * 500;
}

export async function GET(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rates } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('*')
    .eq('commissioner_id', vendor.commissionerId);

  const { data: services } = await supabaseAdmin
    .from('co_services')
    .select('slug, name, price, price_label, min_vendor_rate_cents')
    .eq('active', true)
    .order('display_order', { ascending: true });

  const { data: links } = await supabaseAdmin
    .from('co_commissioner_services')
    .select('service_slug')
    .eq('commissioner_id', vendor.commissionerId);

  const offeredSlugs = new Set((links ?? []).map((l) => l.service_slug));
  const rateMap = new Map((rates ?? []).map((r) => [r.service_slug, r]));

  const merged = (services ?? [])
    .filter((s) => offeredSlugs.has(s.slug))
    .map((s) => {
      const existing = rateMap.get(s.slug);
      const suggestedFirst = s.price != null ? roundToNearest5(s.price * 0.8) : null;
      const suggestedAdditional = roundToNearest5(ADDITIONAL_PAGE_COMPANY_CENTS * 0.8);
      return {
        service_slug: s.slug,
        service_name: s.name,
        service_price: s.price,
        service_price_label: s.price_label,
        min_vendor_rate_cents: s.min_vendor_rate_cents ?? null,
        suggested_first_page_cents: suggestedFirst,
        suggested_additional_page_cents: suggestedAdditional,
        first_page_cents: existing?.first_page_cents ?? suggestedFirst,
        additional_page_cents: existing?.additional_page_cents ?? suggestedAdditional,
        is_saved: !!existing,
      };
    });

  return NextResponse.json({ rates: merged });
}

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rates } = (await req.json()) as {
    rates: { service_slug: string; first_page_cents: number; additional_page_cents?: number }[];
  };

  if (!Array.isArray(rates)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Validate minimums
  const { data: servicesData } = await supabaseAdmin
    .from('co_services')
    .select('slug, min_vendor_rate_cents')
    .eq('active', true);
  const minMap = new Map((servicesData ?? []).map((s) => [s.slug, s.min_vendor_rate_cents]));

  for (const rate of rates) {
    const min = minMap.get(rate.service_slug);
    if (min != null && rate.first_page_cents < min) {
      return NextResponse.json({
        error: `Rate for this service ($${rate.first_page_cents / 100}) is below the minimum ($${min / 100}).`,
      }, { status: 400 });
    }
  }

  for (const rate of rates) {
    if (!rate.service_slug || rate.first_page_cents == null) continue;

    const { data: existing } = await supabaseAdmin
      .from('co_vendor_rates')
      .select('id')
      .eq('commissioner_id', vendor.commissionerId)
      .eq('service_slug', rate.service_slug)
      .single();

    if (existing) {
      await supabaseAdmin.from('co_vendor_rates').update({
        first_page_cents: rate.first_page_cents,
        additional_page_cents: rate.additional_page_cents ?? 1500,
      }).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('co_vendor_rates').insert({
        commissioner_id: vendor.commissionerId,
        service_slug: rate.service_slug,
        first_page_cents: rate.first_page_cents,
        additional_page_cents: rate.additional_page_cents ?? 1500,
      });
    }
  }

  return NextResponse.json({ success: true });
}
