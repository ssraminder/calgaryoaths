/**
 * Attach the place a booking happens to booking rows: the office (co_locations)
 * for in-office bookings, falling back to the commissioner's address when a booking
 * has no location_id. Mobile bookings keep their customer_address; virtual have none.
 */
import { supabaseAdmin } from '@/lib/supabase-server';

export type BookingLocationFields = {
  location_name: string | null;
  location_address: string | null;
};

type LocatableBooking = {
  location_id?: string | null;
  commissioner_id?: string | null;
  delivery_mode?: string | null;
};

export async function withBookingLocations<T extends LocatableBooking>(
  rows: T[]
): Promise<(T & BookingLocationFields)[]> {
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter((x): x is string => !!x))];
  const fallbackIds = [
    ...new Set(rows.filter((r) => !r.location_id && r.commissioner_id).map((r) => r.commissioner_id as string)),
  ];

  const [{ data: locations }, { data: commissioners }] = await Promise.all([
    locationIds.length
      ? supabaseAdmin.from('co_locations').select('id, name, address').in('id', locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; address: string | null }[] }),
    fallbackIds.length
      ? supabaseAdmin.from('co_commissioners').select('id, address').in('id', fallbackIds)
      : Promise.resolve({ data: [] as { id: string; address: string | null }[] }),
  ]);

  const locById = new Map((locations ?? []).map((l) => [l.id, l]));
  const commById = new Map((commissioners ?? []).map((c) => [c.id, c]));

  return rows.map((r) => {
    if (r.delivery_mode === 'mobile' || r.delivery_mode === 'virtual') {
      return { ...r, location_name: null, location_address: null };
    }
    const loc = r.location_id ? locById.get(r.location_id) : undefined;
    if (loc) return { ...r, location_name: loc.name ?? null, location_address: loc.address ?? null };
    const comm = r.commissioner_id ? commById.get(r.commissioner_id) : undefined;
    return { ...r, location_name: null, location_address: comm?.address ?? null };
  });
}
