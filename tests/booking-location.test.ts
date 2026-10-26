import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { FakeSupabase } from './helpers/fake-supabase';

const h = vi.hoisted(() => ({ db: null as unknown as import('./helpers/fake-supabase').FakeSupabase }));
vi.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: (t: string) => h.db.from(t) } }));

import { withBookingLocations } from '@/lib/booking-location';
import { GET as summaryGET } from '@/app/api/booking/summary/route';

const ID = 'ac59ec1e-115c-46c1-839a-d6aac6bbd5ec';

beforeEach(() => {
  h.db = new FakeSupabase();
  h.db.tables = {
    co_locations: [
      { id: 'downtown-calgary', name: 'Downtown Calgary', address: '421 7th Ave SW, #3000, Calgary, AB T2P 4K9' },
    ],
    co_commissioners: [{ id: 'raminder-shah', name: 'Raminder Shah', address: 'Fallback St' }],
    co_bookings: [{
      id: ID, commissioner_id: 'raminder-shah', location_id: 'downtown-calgary', delivery_mode: 'in_office',
      service_name: 'Statutory Declaration', appointment_datetime: '2026-10-26T20:30:00.000Z', status: 'paid',
      name: 'andre greig', email: 'andre@example.com', phone: '403-555-0100', customer_address: null,
    }],
  };
});

describe('withBookingLocations', () => {
  it('attaches the office name and address', async () => {
    const [b] = await withBookingLocations([{ location_id: 'downtown-calgary', commissioner_id: 'raminder-shah', delivery_mode: 'in_office' }]);
    expect(b).toMatchObject({ location_name: 'Downtown Calgary', location_address: '421 7th Ave SW, #3000, Calgary, AB T2P 4K9' });
  });

  it("falls back to the commissioner's address when the booking has no location", async () => {
    const [b] = await withBookingLocations([{ location_id: null, commissioner_id: 'raminder-shah', delivery_mode: null }]);
    expect(b).toMatchObject({ location_name: null, location_address: 'Fallback St' });
  });

  it('mobile and virtual bookings have no office location', async () => {
    const rows = await withBookingLocations([
      { location_id: 'downtown-calgary', commissioner_id: 'raminder-shah', delivery_mode: 'mobile' },
      { location_id: 'downtown-calgary', commissioner_id: 'raminder-shah', delivery_mode: 'virtual' },
    ]);
    expect(rows.map((r) => r.location_address)).toEqual([null, null]);
  });
});

describe('GET /api/booking/summary', () => {
  const get = (id: string) => summaryGET(new NextRequest(`http://localhost/api/booking/summary?id=${id}`));

  it('returns service, time and location — and no customer details', async () => {
    const res = await get(ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      serviceName: 'Statutory Declaration',
      appointmentDatetime: '2026-10-26T20:30:00.000Z',
      status: 'paid',
      deliveryMode: 'in_office',
      locationName: 'Downtown Calgary',
      locationAddress: '421 7th Ave SW, #3000, Calgary, AB T2P 4K9',
      commissionerName: 'Raminder Shah',
    });
    const raw = JSON.stringify(body);
    for (const secret of ['andre', '403-555-0100', 'example.com']) expect(raw).not.toContain(secret);
  });

  it('404s for malformed or unknown IDs', async () => {
    expect((await get('raminder-shah')).status).toBe(404);
    expect((await get('00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });
});
