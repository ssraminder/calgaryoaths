import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;
const DEFAULT_BUFFER_HOURS = 4;

function calgaryOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}

type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function generateSlotsForDay(
  dateStr: string,
  rules: AvailabilityRule[],
  slotMinutes: number
): string[] {
  const offset = calgaryOffset();
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);
  if (dayRules.length === 0) return [];

  const slots: string[] = [];
  for (const rule of dayRules) {
    const [startH, startM] = rule.start_time.split(':').map(Number);
    const [endH, endM] = rule.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + slotMinutes <= endMinutes; m += slotMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const utcH = h - offset;
      const slotDate = new Date(Date.UTC(year, month - 1, day, utcH, min, 0));
      slots.push(slotDate.toISOString());
    }
  }

  return slots;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commissionerId = searchParams.get('commissionerId');
  const startDate = searchParams.get('startDate');
  const locationId = searchParams.get('locationId');

  if (!commissionerId || !startDate) {
    return NextResponse.json({ error: 'Missing commissionerId or startDate' }, { status: 400 });
  }

  // Get buffer hours from settings
  const { data: bufferSetting } = await supabase
    .from('co_settings')
    .select('value')
    .eq('key', 'min_booking_buffer_hours')
    .single();
  const bufferHours = parseInt(bufferSetting?.value || String(DEFAULT_BUFFER_HOURS), 10);

  // Fetch availability rules — filter by location if provided
  let rulesQuery = supabase
    .from('co_availability_rules')
    .select('day_of_week, start_time, end_time')
    .eq('commissioner_id', commissionerId)
    .eq('active', true);

  if (locationId) {
    rulesQuery = rulesQuery.eq('location_id', locationId);
  }

  const { data: rules } = await rulesQuery;
  const availRules = (rules ?? []) as AvailabilityRule[];

  if (availRules.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Generate candidate slots from availability rules
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const base = new Date(sy, sm - 1, sd);
  const allSlots: string[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    allSlots.push(...generateSlotsForDay(dateStr, availRules, SLOT_MINUTES));
  }

  // Filter out past slots (buffer hours from now)
  const cutoff = new Date(Date.now() + bufferHours * 60 * 60 * 1000);
  let available = allSlots.filter((s) => new Date(s) > cutoff);

  // Filter out booked slots from DB (across ALL locations for this commissioner)
  const windowEnd = new Date(base);
  windowEnd.setDate(windowEnd.getDate() + DAYS_AHEAD);

  const { data: booked } = await supabase
    .from('co_bookings')
    .select('appointment_datetime')
    .eq('commissioner_id', commissionerId)
    .not('appointment_datetime', 'is', null)
    .in('status', ['pending_payment', 'paid', 'confirmed'])
    .gte('appointment_datetime', base.toISOString())
    .lte('appointment_datetime', windowEnd.toISOString());

  const bookedSet = new Set((booked ?? []).map((b) => b.appointment_datetime));
  available = available.filter((s) => !bookedSet.has(s));

  // TODO: Calendar integration (Google/Microsoft) will add busy-time filtering here

  return NextResponse.json({ slots: available });
}
