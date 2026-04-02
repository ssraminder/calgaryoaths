import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const commissionerId = req.nextUrl.searchParams.get('commissionerId');
  const customerAddress = req.nextUrl.searchParams.get('address');

  if (!commissionerId || !customerAddress) {
    return NextResponse.json({ error: 'Missing commissionerId or address' }, { status: 400 });
  }

  // Get commissioner address + mobile pricing
  const { data: commissioner } = await supabase
    .from('co_commissioners')
    .select('address, mobile_rate_per_km_cents, mobile_minimum_fee_cents')
    .eq('id', commissionerId)
    .single();

  if (!commissioner?.address) {
    return NextResponse.json({ error: 'Commissioner address not found' }, { status: 404 });
  }

  // Use vendor-specific rates, fall back to global settings
  let ratePerKmCents = commissioner.mobile_rate_per_km_cents;
  let minimumFeeCents = commissioner.mobile_minimum_fee_cents;

  if (ratePerKmCents == null || minimumFeeCents == null) {
    const { data: settings } = await supabase
      .from('co_settings')
      .select('key, value')
      .in('key', ['mobile_rate_per_km_cents', 'mobile_minimum_fee_cents']);
    const config = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));
    ratePerKmCents = ratePerKmCents ?? parseInt(config.mobile_rate_per_km_cents || '300', 10);
    minimumFeeCents = minimumFeeCents ?? parseInt(config.mobile_minimum_fee_cents || '3000', 10);
  }

  // Call Google Maps Distance Matrix API
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Fallback to minimum fee if no API key
    return NextResponse.json({
      distanceKm: null,
      travelFeeCents: minimumFeeCents,
      ratePerKmCents,
      minimumFeeCents,
      fallback: true,
    });
  }

  try {
    const params = new URLSearchParams({
      origins: commissioner.address,
      destinations: customerAddress,
      units: 'metric',
      key: apiKey,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = await res.json();

    if (
      data.status !== 'OK' ||
      !data.rows?.[0]?.elements?.[0] ||
      data.rows[0].elements[0].status !== 'OK'
    ) {
      return NextResponse.json({
        distanceKm: null,
        travelFeeCents: minimumFeeCents,
        ratePerKmCents,
        minimumFeeCents,
        error: 'Could not calculate distance. Using minimum fee.',
      });
    }

    const distanceMeters = data.rows[0].elements[0].distance.value;
    const distanceKm = Math.round(distanceMeters / 100) / 10; // round to 1 decimal
    const calculatedFee = Math.round(distanceKm * ratePerKmCents);
    const travelFeeCents = Math.max(minimumFeeCents, calculatedFee);

    return NextResponse.json({
      distanceKm,
      distanceText: data.rows[0].elements[0].distance.text,
      durationText: data.rows[0].elements[0].duration.text,
      travelFeeCents,
      ratePerKmCents,
      minimumFeeCents,
    });
  } catch (err) {
    console.error('Distance Matrix API error:', err);
    return NextResponse.json({
      distanceKm: null,
      travelFeeCents: minimumFeeCents,
      ratePerKmCents,
      minimumFeeCents,
      error: 'Distance calculation failed. Using minimum fee.',
    });
  }
}
