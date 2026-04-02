import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();

  return NextResponse.json({
    ga4Id: settings.ga4_id ?? null,
    gtmId: settings.gtm_id ?? null,
    googleAdsId: settings.google_ads_id ?? null,
  });
}
