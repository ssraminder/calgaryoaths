import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/** Commissioner hours (Calgary local time, MDT = UTC-6 / MST = UTC-7) */
const HOURS: Record<string, { start: number; end: number } | null> = {
  0: null,           // Sunday — closed
  1: { start: 9, end: 21 },
  2: { start: 9, end: 21 },
  3: { start: 9, end: 21 },
  4: { start: 9, end: 21 },
  5: { start: 9, end: 21 },
  6: { start: 10, end: 17 }, // Saturday
};

const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

function calgaryOffset(): number {
  // MDT (summer): UTC-6  MST (winter): UTC-7
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}

function toCalgarySlotsForDay(dateStr: string): string[] {
  const offset = calgaryOffset();
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  const hours = HOURS[dayOfWeek];
  if (!hours) return [];

  const slots: string[] = [];
  for (let h = hours.start; h < hours.end; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const utcH = h - offset;
      const slotDate = new Date(Date.UTC(year, month - 1, day, utcH, m, 0));
      slots.push(slotDate.toISOString());
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commissionerId = searchParams.get('commissionerId');
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD

  if (!commissionerId || !startDate) {
    return NextResponse.json({ error: 'Missing commissionerId or startDate' }, { status: 400 });
  }

  // Build slot candidates for next DAYS_AHEAD days
  const allSlots: string[] = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const base = new Date(sy, sm - 1, sd);

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    allSlots.push(...toCalgarySlotsForDay(dateStr));
  }

  // Filter out past slots (need at least 1 hour buffer)
  const cutoff = new Date(Date.now() + 60 * 60 * 1000);
  const futureSlots = allSlots.filter((s) => new Date(s) > cutoff);

  // Fetch already-booked slots for this commissioner
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
  const available = futureSlots.filter((s) => !bookedSet.has(s));

  return NextResponse.json({ slots: available });
}
