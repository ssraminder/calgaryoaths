import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const vendorId = req.nextUrl.searchParams.get('vendorId');
  if (!vendorId) {
    return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 });
  }

  // Fetch vendor profile
  const { data: vendor, error: vendorError } = await supabase
    .from('co_commissioners')
    .select('id, name, title, location, address, languages, credentials, mobile_available, virtual_available')
    .eq('id', vendorId)
    .eq('active', true)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  // Fetch services this vendor offers
  const { data: links } = await supabase
    .from('co_commissioner_services')
    .select('service_slug')
    .eq('commissioner_id', vendorId);

  const slugs = (links ?? []).map((l) => l.service_slug);
  if (slugs.length === 0) {
    return NextResponse.json({ vendor, services: [] });
  }

  // Fetch service details
  const { data: services } = await supabase
    .from('co_services')
    .select('slug, name, short_description, price, price_label, requires_review, review_reason, slot_duration_minutes')
    .eq('active', true)
    .in('slug', slugs)
    .order('display_order', { ascending: true });

  // Fetch vendor-specific rates
  const { data: rates } = await supabase
    .from('co_vendor_rates')
    .select('service_slug, first_page_cents, additional_page_cents')
    .eq('commissioner_id', vendorId);

  const rateMap = new Map((rates ?? []).map((r) => [r.service_slug, r]));

  const enrichedServices = (services ?? []).map((s) => {
    const rate = rateMap.get(s.slug);
    return {
      slug: s.slug,
      name: s.name,
      shortDescription: s.short_description,
      price: rate?.first_page_cents ?? s.price,
      priceLabel: rate?.first_page_cents
        ? `$${(rate.first_page_cents / 100).toFixed(0)}`
        : s.price != null
          ? `$${(s.price / 100).toFixed(0)}`
          : s.price_label,
      additionalPageCents: rate?.additional_page_cents ?? 1500,
      requiresReview: s.requires_review,
      reviewReason: s.review_reason,
      slotDurationMinutes: s.slot_duration_minutes ?? 30,
    };
  });

  // Fetch vendor's location
  const { data: locations } = await supabase
    .from('co_locations')
    .select('id')
    .eq('commissioner_id', vendorId)
    .eq('active', true)
    .limit(1);

  return NextResponse.json({
    vendor,
    services: enrichedServices,
    locationId: locations?.[0]?.id ?? null,
  });
}
