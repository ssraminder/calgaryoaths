import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function calgaryOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}

export async function GET(req: NextRequest) {
  const serviceSlug = new URL(req.url).searchParams.get('serviceSlug');
  if (!serviceSlug) {
    return NextResponse.json({ error: 'Missing serviceSlug' }, { status: 400 });
  }

  // Commissioner IDs offering this service
  const { data: links, error: linkError } = await supabase
    .from('co_commissioner_services')
    .select('commissioner_id')
    .eq('service_slug', serviceSlug);

  if (linkError) return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  const ids = (links ?? []).map((l) => l.commissioner_id);
  if (ids.length === 0) return NextResponse.json({ options: [] });

  // Commissioners
  const { data: commissioners } = await supabase
    .from('co_commissioners')
    .select('id, name, booking_fee_cents, languages, mobile_available, mobile_travel_fee_cents, virtual_available, commission_rate, commission_mode')
    .in('id', ids)
    .eq('active', true);

  if (!commissioners?.length) return NextResponse.json({ options: [] });

  // Vendor rates for this service
  const { data: rates } = await supabase
    .from('co_vendor_rates')
    .select('commissioner_id, first_page_cents, additional_page_cents, drafting_fee_cents')
    .eq('service_slug', serviceSlug)
    .in('commissioner_id', ids);
  const rateMap = new Map((rates ?? []).map((r) => [r.commissioner_id, r]));

  // All active locations for these commissioners
  const { data: locations } = await supabase
    .from('co_locations')
    .select('id, name, address, commissioner_id, nearby_neighbourhoods')
    .in('commissioner_id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  // Buffer hours
  const { data: bufferSetting } = await supabase
    .from('co_settings').select('value').eq('key', 'min_booking_buffer_hours').single();
  const bufferHours = parseInt(bufferSetting?.value || '4', 10);

  const now = new Date();
  const cutoff = new Date(Date.now() + bufferHours * 60 * 60 * 1000);
  const offset = calgaryOffset();
  const commMap = new Map(commissioners.map((c) => [c.id, c]));

  // Build a flat list: one entry per location
  const options = await Promise.all(
    (locations ?? []).map(async (loc) => {
      const comm = commMap.get(loc.commissioner_id);
      if (!comm) return null;

      // Availability rules for THIS location
      const { data: rules } = await supabase
        .from('co_availability_rules')
        .select('day_of_week, start_time, end_time')
        .eq('commissioner_id', comm.id)
        .eq('location_id', loc.id)
        .eq('active', true);

      // Booked slots (across all locations for this commissioner)
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const { data: booked } = await supabase
        .from('co_bookings')
        .select('appointment_datetime')
        .eq('commissioner_id', comm.id)
        .not('appointment_datetime', 'is', null)
        .in('status', ['pending_payment', 'paid', 'confirmed'])
        .gte('appointment_datetime', now.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());
      const bookedSet = new Set((booked ?? []).map((b) => b.appointment_datetime));

      // Find soonest slot at this location
      let soonestSlot: string | null = null;
      if (rules?.length) {
        for (let i = 0; i < 7 && !soonestSlot; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          const dayOfWeek = d.getDay();
          const [year, month, day] = d.toISOString().slice(0, 10).split('-').map(Number);
          const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);

          for (const rule of dayRules) {
            const [sH, sM] = rule.start_time.split(':').map(Number);
            const [eH, eM] = rule.end_time.split(':').map(Number);
            for (let m = sH * 60 + sM; m + 30 <= eH * 60 + eM; m += 30) {
              const slotDate = new Date(Date.UTC(year, month - 1, day, Math.floor(m / 60) - offset, m % 60, 0));
              if (slotDate > cutoff && !bookedSet.has(slotDate.toISOString())) {
                soonestSlot = slotDate.toISOString();
                break;
              }
            }
            if (soonestSlot) break;
          }
        }
      }

      const rate = rateMap.get(comm.id);
      return {
        // Location info
        locationId: loc.id,
        locationName: loc.name,
        locationAddress: loc.address,
        areas_served: loc.nearby_neighbourhoods ?? [],
        // Commissioner info
        commissionerId: comm.id,
        commissionerName: comm.name,
        languages: comm.languages,
        mobile_available: comm.mobile_available,
        mobile_travel_fee_cents: comm.mobile_travel_fee_cents,
        virtual_available: comm.virtual_available,
        commission_rate: comm.commission_rate,
        commission_mode: comm.commission_mode,
        booking_fee_cents: comm.booking_fee_cents,
        // Rates
        first_page_cents: rate?.first_page_cents ?? null,
        additional_page_cents: rate?.additional_page_cents ?? null,
        drafting_fee_cents: rate?.drafting_fee_cents ?? null,
        // Availability
        soonestSlot,
        hasAvailability: (rules?.length ?? 0) > 0,
      };
    })
  );

  // Filter nulls, sort by soonest availability
  const filtered = options.filter(Boolean) as NonNullable<(typeof options)[number]>[];
  filtered.sort((a, b) => {
    if (!a.soonestSlot && !b.soonestSlot) return 0;
    if (!a.soonestSlot) return 1;
    if (!b.soonestSlot) return -1;
    return new Date(a.soonestSlot).getTime() - new Date(b.soonestSlot).getTime();
  });

  return NextResponse.json({ options: filtered });
}
