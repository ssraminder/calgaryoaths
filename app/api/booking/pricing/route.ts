import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const province = req.nextUrl.searchParams.get('province') || 'AB';

  const [settingsRes, taxRes] = await Promise.all([
    supabase.from('co_settings').select('key, value').in('key', ['convenience_fee_cents', 'default_province']),
    supabase.from('co_tax_rates').select('*').eq('province_code', province).single(),
  ]);

  const settings = Object.fromEntries(
    (settingsRes.data ?? []).map((r) => [r.key, r.value])
  );

  return NextResponse.json({
    convenienceFeeCents: parseInt(settings.convenience_fee_cents || '499', 10),
    defaultProvince: settings.default_province || 'AB',
    tax: taxRes.data ?? { province_code: 'AB', total_rate: 0.05, gst_rate: 0.05, pst_rate: 0, hst_rate: 0 },
  });
}
