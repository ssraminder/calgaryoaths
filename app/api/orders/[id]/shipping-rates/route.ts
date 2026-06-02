import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import {
  ShippoError,
  fetchRates,
  getShippoKey,
  getOrigin,
  type ShippingAddress,
} from '@/lib/shipping/shippo';

const bodySchema = z.object({
  parcel: z.object({
    weight_g: z.number().positive(),
    length_cm: z.number().positive(),
    width_cm: z.number().positive(),
    height_cm: z.number().positive(),
  }),
  destination_override: z
    .object({
      name: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      street1: z.string().min(1),
      street2: z.string().optional().nullable(),
      city: z.string().min(1),
      state: z.string().optional().nullable(),
      zip: z.string().min(1),
      country: z.string().min(2),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
    })
    .optional(),
});

function countryNameToCode(name: string | null | undefined): string {
  if (!name) return '';
  const t = name.trim();
  if (t.length === 2) return t.toUpperCase();
  const map: Record<string, string> = {
    canada: 'CA',
    'united states': 'US',
    'united states of america': 'US',
    usa: 'US',
    'us of a': 'US',
    spain: 'ES',
    mexico: 'MX',
    'united kingdom': 'GB',
    uk: 'GB',
    france: 'FR',
    germany: 'DE',
    italy: 'IT',
    portugal: 'PT',
    netherlands: 'NL',
    belgium: 'BE',
    switzerland: 'CH',
    australia: 'AU',
    'new zealand': 'NZ',
    india: 'IN',
    china: 'CN',
    japan: 'JP',
    'south korea': 'KR',
    korea: 'KR',
    brazil: 'BR',
    argentina: 'AR',
    chile: 'CL',
    colombia: 'CO',
    'south africa': 'ZA',
    nigeria: 'NG',
    kenya: 'KE',
    egypt: 'EG',
    uae: 'AE',
    'united arab emirates': 'AE',
    'saudi arabia': 'SA',
    philippines: 'PH',
    indonesia: 'ID',
    malaysia: 'MY',
    singapore: 'SG',
    thailand: 'TH',
    vietnam: 'VN',
    poland: 'PL',
    sweden: 'SE',
    norway: 'NO',
    denmark: 'DK',
    finland: 'FI',
    ireland: 'IE',
    austria: 'AT',
    greece: 'GR',
    'czech republic': 'CZ',
    czechia: 'CZ',
    turkey: 'TR',
    israel: 'IL',
    pakistan: 'PK',
    bangladesh: 'BD',
  };
  return map[t.toLowerCase()] || '';
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const apiKey = await getShippoKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Shippo API key is not configured. Set shippo_api_key in Admin → Settings.' },
      { status: 400 }
    );
  }

  const { id } = ctx.params;
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('co_orders')
    .select('id, customer_name, customer_email, customer_phone, customer_address_street, customer_address_unit, customer_address_city, customer_address_province, customer_address_postal, customer_address_country')
    .eq('id', id)
    .single();
  if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  let destination: ShippingAddress;
  if (parsed.data.destination_override) {
    const d = parsed.data.destination_override;
    const country = d.country.length === 2 ? d.country.toUpperCase() : countryNameToCode(d.country);
    if (!country) {
      return NextResponse.json({ error: `Could not resolve country "${d.country}" to an ISO code.` }, { status: 400 });
    }
    destination = { ...d, country };
  } else {
    const country = countryNameToCode(order.customer_address_country);
    if (!order.customer_address_street || !order.customer_address_city || !order.customer_address_postal || !country) {
      return NextResponse.json(
        { error: 'Order address is incomplete (need street, city, postal code, country).' },
        { status: 400 }
      );
    }
    destination = {
      name: order.customer_name,
      street1: order.customer_address_street,
      street2: order.customer_address_unit || null,
      city: order.customer_address_city,
      state: order.customer_address_province || null,
      zip: order.customer_address_postal,
      country,
      phone: order.customer_phone || null,
      email: order.customer_email || null,
    };
  }

  const origin = await getOrigin();

  try {
    const { rates, messages } = await fetchRates({
      origin,
      destination,
      parcel: parsed.data.parcel,
      apiKey,
    });
    return NextResponse.json({ rates, messages, destination, origin });
  } catch (err) {
    if (err instanceof ShippoError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 401 ? 401 : 502 });
    }
    console.error('Shippo fetch failed', err);
    return NextResponse.json({ error: 'Failed to fetch shipping rates' }, { status: 500 });
  }
}
