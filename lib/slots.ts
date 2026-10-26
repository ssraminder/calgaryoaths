/**
 * Pure slot computation for /api/booking/slots — no I/O, so it can be unit tested.
 * All wall-clock inputs are Calgary local time; all outputs are UTC ISO strings.
 */
import { addDays, calgaryLocalToUtc, dayOfWeek } from '@/lib/calgary-time';

export type AvailabilityRule = {
  day_of_week: number;
  start_time: string; // HH:MM[:SS] Calgary
  end_time: string;   // HH:MM[:SS] Calgary
};

export type CustomTime = {
  custom_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  mode: string; // 'add' | 'block'
};

export type TimeRange = { start: string; end: string }; // ISO instants

export type SlotInputs = {
  startDate: string;          // YYYY-MM-DD (Calgary)
  now: Date;
  bufferHours: number;        // min_booking_buffer_hours
  rules: AvailabilityRule[];  // already filtered to the location
  blockedDates: Set<string>;  // co_blocked_dates
  customTimes: CustomTime[];  // co_custom_times (manual + calendar-synced)
  bookedTimes: string[];      // appointment_datetime of bookings holding a slot
  busyPeriods: TimeRange[];   // live busy times from connected calendars
  daysAhead?: number;
  slotMinutes?: number;
};

export const SLOT_MINUTES = 30;
export const DAYS_AHEAD = 14;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function slotsForWindow(dateStr: string, start: string, end: string, slotMinutes: number): number[] {
  const out: number[] = [];
  const startMin = minutesOf(start);
  const endMin = minutesOf(end);
  for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(calgaryLocalToUtc(dateStr, `${hh}:${mm}`).getTime());
  }
  return out;
}

export function computeAvailableSlots(input: SlotInputs): string[] {
  const slotMinutes = input.slotMinutes ?? SLOT_MINUTES;
  const daysAhead = input.daysAhead ?? DAYS_AHEAD;
  const slotMs = slotMinutes * 60 * 1000;

  // Candidate slots from weekly rules + 'add' overrides
  const candidates = new Set<number>();
  for (let i = 0; i < daysAhead; i++) {
    const dateStr = addDays(input.startDate, i);
    if (input.blockedDates.has(dateStr)) continue;
    const dow = dayOfWeek(dateStr);
    for (const rule of input.rules) {
      if (rule.day_of_week !== dow) continue;
      for (const t of slotsForWindow(dateStr, rule.start_time, rule.end_time, slotMinutes)) candidates.add(t);
    }
    for (const ct of input.customTimes) {
      if (ct.mode !== 'add' || ct.custom_date !== dateStr) continue;
      for (const t of slotsForWindow(dateStr, ct.start_time, ct.end_time, slotMinutes)) candidates.add(t);
    }
  }

  // Everything that removes a slot, as UTC ranges
  const blocks: { start: number; end: number }[] = [];
  for (const ct of input.customTimes) {
    if (ct.mode !== 'block') continue;
    blocks.push({
      start: calgaryLocalToUtc(ct.custom_date, ct.start_time).getTime(),
      end: calgaryLocalToUtc(ct.custom_date, ct.end_time).getTime(),
    });
  }
  for (const b of input.busyPeriods) {
    blocks.push({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() });
  }

  const cutoff = input.now.getTime() + input.bufferHours * 60 * 60 * 1000;
  const booked = new Set(input.bookedTimes.map((t) => new Date(t).getTime()));

  return [...candidates]
    .filter((start) => start > cutoff)
    .filter((start) => !booked.has(start))
    // A slot is unavailable if it overlaps any block at all (not just if it starts inside one)
    .filter((start) => !blocks.some((b) => start < b.end && start + slotMs > b.start))
    .sort((a, b) => a - b)
    .map((t) => new Date(t).toISOString());
}

/** UTC bounds of the slot window, for DB queries. */
export function slotWindow(startDate: string, daysAhead = DAYS_AHEAD) {
  return {
    startUtc: calgaryLocalToUtc(startDate, '00:00'),
    endUtc: calgaryLocalToUtc(addDays(startDate, daysAhead), '00:00'),
    lastDate: addDays(startDate, daysAhead),
  };
}
