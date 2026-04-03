import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

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
  const { data: links, error: linkError } = await supabaseAdmin
    .from('co_commissioner_services')
    .select('commissioner_id')
    .eq('service_slug', serviceSlug);

  if (linkError) return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  const ids = (links ?? []).map((l) => l.commissioner_id);
  if (ids.length === 0) return NextResponse.json({ options: [] });

  // Commissioners
  const { data: commissioners } = await supabaseAdmin
    .from('co_commissioners')
    .select('id, name, booking_fee_cents, languages, mobile_available, mobile_travel_fee_cents, virtual_available, commission_rate, commission_mode, min_booking_buffer_hours, auto_accept_all')
    .in('id', ids)
    .eq('active', true);

  if (!commissioners?.length) return NextResponse.json({ options: [] });

  // Vendor rates for this service
  const { data: rates } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('commissioner_id, first_page_cents, additional_page_cents, drafting_fee_cents')
    .eq('service_slug', serviceSlug)
    .in('commissioner_id', ids);
  const rateMap = new Map((rates ?? []).map((r) => [r.commissioner_id, r]));

  // Fetch service price for suggested rate fallback
  const { data: serviceData } = await supabaseAdmin
    .from('co_services')
    .select('price')
    .eq('slug', serviceSlug)
    .single();
  const suggestedRate = serviceData?.price
    ? Math.round((serviceData.price * 0.8) / 500) * 500
    : null;

  // All active locations for these commissioners
  const { data: locations } = await supabaseAdmin
    .from('co_locations')
    .select('id, name, address, commissioner_id, nearby_neighbourhoods')
    .in('commissioner_id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  // Global buffer fallback
  const { data: bufferSetting } = await supabaseAdmin
    .from('co_settings').select('value').eq('key', 'min_booking_buffer_hours').single();
  const globalBufferHours = parseInt(bufferSetting?.value || '4', 10);

  const now = new Date();
  const offset = calgaryOffset();
  const commMap = new Map(commissioners.map((c) => [c.id, c]));

  // Build a flat list: one entry per location
  const options = await Promise.all(
    (locations ?? []).map(async (loc) => {
      const comm = commMap.get(loc.commissioner_id);
      const bufferHours = comm?.min_booking_buffer_hours ?? globalBufferHours;
      const cutoff = new Date(Date.now() + bufferHours * 60 * 60 * 1000);
      if (!comm) return null;

      // Availability rules for THIS location
      const { data: rules } = await supabaseAdmin
        .from('co_availability_rules')
        .select('day_of_week, start_time, end_time')
        .eq('commissioner_id', comm.id)
        .eq('location_id', loc.id)
        .eq('active', true);

      // Booked slots (across all locations for this commissioner)
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const { data: booked } = await supabaseAdmin
        .from('co_bookings')
        .select('appointment_datetime')
        .eq('commissioner_id', comm.id)
        .not('appointment_datetime', 'is', null)
        .in('status', ['pending_payment', 'paid', 'confirmed'])
        .gte('appointment_datetime', now.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());
      const bookedSet = new Set((booked ?? []).map((b) => b.appointment_datetime));

      // Use Calgary local date for all date comparisons
      const calgaryToday = new Date(now.getTime() + offset * 3_600_000)
        .toISOString().slice(0, 10);

      // Blocked dates for this commissioner
      const { data: blockedDatesData } = await supabaseAdmin
        .from('co_blocked_dates')
        .select('blocked_date')
        .eq('commissioner_id', comm.id)
        .gte('blocked_date', calgaryToday);
      const blockedDates = new Set((blockedDatesData ?? []).map((b) => b.blocked_date));

      // Time-window blocks from co_custom_times
      let blockOverrides = new Map<string, { start_time: string; end_time: string }[]>();
      try {
        const { data: ctData } = await supabaseAdmin
          .from('co_custom_times')
          .select('custom_date, start_time, end_time, mode')
          .eq('commissioner_id', comm.id)
          .eq('mode', 'block')
          .gte('custom_date', calgaryToday);
        for (const ct of ctData ?? []) {
          if (!blockOverrides.has(ct.custom_date)) blockOverrides.set(ct.custom_date, []);
          blockOverrides.get(ct.custom_date)!.push({ start_time: ct.start_time, end_time: ct.end_time });
        }
      } catch { /* table may not exist yet */ }

      // Find soonest slot at this location
      let soonestSlot: string | null = null;
      if (rules?.length) {
        const calgaryNow = new Date(now.getTime() + offset * 3_600_000);
        for (let i = 0; i < 7 && !soonestSlot; i++) {
          const d = new Date(calgaryNow);
          d.setUTCDate(calgaryNow.getUTCDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          if (blockedDates.has(dateStr)) continue; // Skip fully blocked dates
          const dayOfWeek = d.getUTCDay();
          const [year, month, day] = dateStr.split('-').map(Number);
          const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);
          const dayBlocks = blockOverrides.get(dateStr);

          for (const rule of dayRules) {
            const [sH, sM] = rule.start_time.split(':').map(Number);
            const [eH, eM] = rule.end_time.split(':').map(Number);
            for (let m = sH * 60 + sM; m + 30 <= eH * 60 + eM; m += 30) {
              const slotDate = new Date(Date.UTC(year, month - 1, day, Math.floor(m / 60) - offset, m % 60, 0));
              if (slotDate > cutoff && !bookedSet.has(slotDate.toISOString())) {
                // Check time-window blocks
                let blocked = false;
                if (dayBlocks) {
                  for (const blk of dayBlocks) {
                    const [bsH, bsM] = blk.start_time.split(':').map(Number);
                    const [beH, beM] = blk.end_time.split(':').map(Number);
                    const blockStart = new Date(Date.UTC(year, month - 1, day, bsH - offset, bsM, 0));
                    const blockEnd = new Date(Date.UTC(year, month - 1, day, beH - offset, beM, 0));
                    if (slotDate >= blockStart && slotDate < blockEnd) {
                      blocked = true;
                      break;
                    }
                  }
                }
                if (!blocked) {
                  soonestSlot = slotDate.toISOString();
                  break;
                }
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
        languages: comm.languages ?? [],
        mobile_available: comm.mobile_available,
        mobile_travel_fee_cents: comm.mobile_travel_fee_cents,
        virtual_available: comm.virtual_available,
        commission_rate: comm.commission_rate,
        commission_mode: comm.commission_mode,
        booking_fee_cents: comm.booking_fee_cents,
        // Rates (vendor rate → suggested rate fallback)
        first_page_cents: rate?.first_page_cents ?? suggestedRate,
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
