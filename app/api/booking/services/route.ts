import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { BookingService } from '@/lib/data/booking';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase
    .from('co_services')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
  }

  // Fetch lowest vendor rate per service
  const { data: rates } = await supabase
    .from('co_vendor_rates')
    .select('service_slug, first_page_cents');

  const minRateMap = new Map<string, number>();
  for (const r of rates ?? []) {
    if (r.first_page_cents == null) continue;
    const current = minRateMap.get(r.service_slug);
    if (current == null || r.first_page_cents < current) {
      minRateMap.set(r.service_slug, r.first_page_cents);
    }
  }

  const services: BookingService[] = (data ?? []).map((row) => {
    // Use lowest vendor rate if available, otherwise fall back to service price
    const lowestVendorRate = minRateMap.get(row.slug);
    const displayPrice = lowestVendorRate ?? row.price;
    const displayLabel = displayPrice != null
      ? `From $${(displayPrice / 100).toFixed(0)}`
      : row.price_label;

    return {
      slug: row.slug,
      name: row.name,
      shortDescription: row.short_description,
      price: displayPrice,
      priceLabel: displayLabel,
      requiresReview: row.requires_review,
      reviewReason: row.review_reason ?? undefined,
      slotDurationMinutes: row.slot_duration_minutes ?? 30,
    };
  });

  return NextResponse.json({ services });
}
