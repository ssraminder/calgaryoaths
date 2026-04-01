import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const serviceSlug = new URL(req.url).searchParams.get('serviceSlug');

  if (!serviceSlug) {
    return NextResponse.json({ error: 'Missing serviceSlug' }, { status: 400 });
  }

  // Get commissioner IDs that offer this service
  const { data: links, error: linkError } = await supabase
    .from('co_commissioner_services')
    .select('commissioner_id')
    .eq('service_slug', serviceSlug);

  if (linkError) {
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }

  const ids = (links ?? []).map((l) => l.commissioner_id);
  if (ids.length === 0) {
    return NextResponse.json({ commissioners: [] });
  }

  const { data: commissioners, error: comError } = await supabase
    .from('co_commissioners')
    .select('id, name, location, booking_fee_cents, languages')
    .in('id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (comError) {
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }

  // For each commissioner, find the soonest available slot
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 60 * 60 * 1000);

  const enriched = await Promise.all(
    (commissioners ?? []).map(async (c) => {
      // Get availability rules
      const { data: rules } = await supabase
        .from('co_availability_rules')
        .select('day_of_week, start_time, end_time')
        .eq('commissioner_id', c.id)
        .eq('active', true);

      if (!rules || rules.length === 0) {
        return { ...c, soonestSlot: null };
      }

      // Get booked slots
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 7);

      const { data: booked } = await supabase
        .from('co_bookings')
        .select('appointment_datetime')
        .eq('commissioner_id', c.id)
        .not('appointment_datetime', 'is', null)
        .in('status', ['pending_payment', 'paid', 'confirmed'])
        .gte('appointment_datetime', now.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());

      const bookedSet = new Set((booked ?? []).map((b) => b.appointment_datetime));

      // Find first available slot in next 7 days
      const offset = calgaryOffset();
      let soonestSlot: string | null = null;

      for (let i = 0; i < 7 && !soonestSlot; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().slice(0, 10);
        const [year, month, day] = dateStr.split('-').map(Number);

        const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);
        for (const rule of dayRules) {
          const [startH, startM] = rule.start_time.split(':').map(Number);
          const [endH, endM] = rule.end_time.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            const utcH = h - offset;
            const slotDate = new Date(Date.UTC(year, month - 1, day, utcH, min, 0));
            if (slotDate > cutoff && !bookedSet.has(slotDate.toISOString())) {
              soonestSlot = slotDate.toISOString();
              break;
            }
          }
          if (soonestSlot) break;
        }
      }

      return { ...c, soonestSlot };
    })
  );

  // Sort by soonest availability (commissioners with earlier slots first)
  enriched.sort((a, b) => {
    if (!a.soonestSlot && !b.soonestSlot) return 0;
    if (!a.soonestSlot) return 1;
    if (!b.soonestSlot) return -1;
    return new Date(a.soonestSlot).getTime() - new Date(b.soonestSlot).getTime();
  });

  return NextResponse.json({ commissioners: enriched });
}

function calgaryOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}
