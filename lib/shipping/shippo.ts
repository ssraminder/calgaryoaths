import { getSettings } from '@/lib/data/db';

export interface ShippingAddress {
  name?: string | null;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

export interface Parcel {
  weight_g: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

export interface NormalizedRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  delivery_days: number | null;
  est_delivery_date: string | null;
  delivery_date_guaranteed: boolean;
}

export const ORIGIN_DEFAULTS = {
  company: 'Calgary Oaths',
  street1: '421 7 Ave SW',
  street2: 'Floor 30',
  city: 'Calgary',
  state: 'AB',
  zip: 'T2P 4K9',
  country: 'CA',
} as const;

export const PARCEL_PRESETS = {
  flat_document: {
    label: 'Flat document envelope',
    weight_g: 250,
    length_cm: 30,
    width_cm: 22,
    height_cm: 2,
  },
  small_box: {
    label: 'Small box',
    weight_g: 500,
    length_cm: 25,
    width_cm: 18,
    height_cm: 10,
  },
} as const;

export async function getOrigin(): Promise<ShippingAddress> {
  const s = await getSettings();
  return {
    company: s.shipping_origin_company || ORIGIN_DEFAULTS.company,
    street1: s.shipping_origin_street || ORIGIN_DEFAULTS.street1,
    street2: s.shipping_origin_unit || ORIGIN_DEFAULTS.street2,
    city: s.shipping_origin_city || ORIGIN_DEFAULTS.city,
    state: s.shipping_origin_province || ORIGIN_DEFAULTS.state,
    zip: s.shipping_origin_postal || ORIGIN_DEFAULTS.zip,
    country: s.shipping_origin_country || ORIGIN_DEFAULTS.country,
    phone: s.shipping_origin_phone || null,
  };
}

export async function getShippoKey(): Promise<string | null> {
  const s = await getSettings();
  return s.shippo_api_key || null;
}

interface ShippoAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel: { name: string; token?: string; terms?: string };
  amount: string;
  currency: string;
  estimated_days: number | null;
  duration_terms: string | null;
  attributes?: string[];
}

interface ShippoShipmentResponse {
  object_id?: string;
  rates?: ShippoRate[];
  messages?: Array<{ source?: string; code?: string; text: string }>;
  detail?: string;
  // Shippo sometimes returns flat error objects
  [k: string]: unknown;
}

function toShippoAddress(a: ShippingAddress): ShippoAddress {
  return {
    ...(a.name ? { name: a.name } : {}),
    ...(a.company ? { company: a.company } : {}),
    street1: a.street1,
    ...(a.street2 ? { street2: a.street2 } : {}),
    city: a.city,
    ...(a.state ? { state: a.state } : {}),
    zip: a.zip,
    country: a.country,
    ...(a.phone ? { phone: a.phone } : {}),
    ...(a.email ? { email: a.email } : {}),
  };
}

export class ShippoError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ShippoError';
    this.status = status;
  }
}

export async function fetchRates(opts: {
  origin: ShippingAddress;
  destination: ShippingAddress;
  parcel: Parcel;
  apiKey: string;
}): Promise<{ rates: NormalizedRate[]; messages: string[] }> {
  const { origin, destination, parcel, apiKey } = opts;

  const body = {
    address_from: toShippoAddress(origin),
    address_to: toShippoAddress(destination),
    parcels: [
      {
        length: parcel.length_cm.toString(),
        width: parcel.width_cm.toString(),
        height: parcel.height_cm.toString(),
        distance_unit: 'cm',
        weight: parcel.weight_g.toString(),
        mass_unit: 'g',
      },
    ],
    async: false,
  };

  const res = await fetch('https://api.goshippo.com/shipments/', {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as ShippoShipmentResponse;

  if (!res.ok) {
    const msg = data?.detail
      || (data?.messages && data.messages[0]?.text)
      || `Shippo request failed (${res.status})`;
    throw new ShippoError(msg, res.status);
  }

  const rates: NormalizedRate[] = (data.rates ?? []).map((r) => ({
    id: r.object_id,
    carrier: r.provider,
    service: r.servicelevel?.name || r.servicelevel?.token || 'Unknown service',
    rate: parseFloat(r.amount),
    currency: r.currency,
    delivery_days: r.estimated_days ?? null,
    est_delivery_date: null,
    delivery_date_guaranteed: false,
  })).filter((r) => Number.isFinite(r.rate));

  rates.sort((a, b) => a.rate - b.rate);

  const messages = (data.messages ?? []).map((m) => {
    const prefix = m.source ? `${m.source}: ` : '';
    return `${prefix}${m.text}`;
  });

  return { rates, messages };
}
