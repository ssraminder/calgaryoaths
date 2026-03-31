import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { BookingService } from '@/lib/data/booking';

export async function GET() {
  const { data, error } = await supabase
    .from('co_services')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
  }

  const services: BookingService[] = (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    price: row.price,
    priceLabel: row.price_label,
    requiresReview: row.requires_review,
    reviewReason: row.review_reason ?? undefined,
  }));

  return NextResponse.json({ services });
}
