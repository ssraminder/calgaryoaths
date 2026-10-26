import { describe, it, expect } from 'vitest';
import { computeAvailableSlots, type SlotInputs } from '@/lib/slots';

// Raminder's real Downtown rules: Mon–Fri 11:00–17:00
const downtownRules = [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: '11:00:00', end_time: '17:00:00' }));
// A hypothetical NE rule set: Mon 09:00–12:00
const neRules = [{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }];

function base(overrides: Partial<SlotInputs> = {}): SlotInputs {
  return {
    startDate: '2026-10-26',
    now: new Date('2026-10-26T12:00:00Z'), // 06:00 MDT Monday
    bufferHours: 2,
    rules: downtownRules,
    blockedDates: new Set(),
    customTimes: [],
    bookedTimes: [],
    busyPeriods: [],
    ...overrides,
  };
}

const local = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const onDay = (slots: string[], day: string) =>
  slots.filter((s) => new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' }) === day).map(local);

// Outlook "Busy" 06:15–12:00 MDT on Mon Oct 26 — the event from the bug report
const busyMorning = { start: '2026-10-26T12:15:00.000Z', end: '2026-10-26T18:00:00.000Z' };
// Rick Bekkerus booking, 13:30 MDT
const rickBooking = '2026-10-26T19:30:00.000Z';

describe('computeAvailableSlots', () => {
  it('generates Calgary-local slots for the day', () => {
    const slots = onDay(computeAvailableSlots(base()), '2026-10-26');
    expect(slots[0]).toBe('11:00');
    expect(slots.at(-1)).toBe('16:30');
    expect(slots).toHaveLength(12);
  });

  it('REGRESSION: an Outlook Busy 06:15–12:00 removes 11:00 and 11:30', () => {
    const slots = onDay(computeAvailableSlots(base({ busyPeriods: [busyMorning], bookedTimes: [rickBooking] })), '2026-10-26');
    expect(slots).not.toContain('11:00');
    expect(slots).not.toContain('11:30');
    expect(slots).not.toContain('13:30'); // own booking
    expect(slots[0]).toBe('12:00');
  });

  it('the same window from synced co_custom_times blocks works when the live fetch failed', () => {
    const slots = onDay(
      computeAvailableSlots(base({
        customTimes: [{ custom_date: '2026-10-26', start_time: '06:15', end_time: '12:00', mode: 'block' }],
      })),
      '2026-10-26'
    );
    expect(slots).not.toContain('11:00');
    expect(slots).not.toContain('11:30');
    expect(slots).toContain('12:00');
  });

  it('blocks any overlap, not just slots that start inside the busy window', () => {
    const slots = onDay(
      computeAvailableSlots(base({ busyPeriods: [{ start: '2026-10-26T20:15:00Z', end: '2026-10-26T20:45:00Z' }] })), // 14:15–14:45
      '2026-10-26'
    );
    expect(slots).not.toContain('14:00');
    expect(slots).not.toContain('14:30');
    expect(slots).toContain('13:30');
    expect(slots).toContain('15:00');
  });

  it('applies to the NE location rules too', () => {
    const slots = onDay(computeAvailableSlots(base({ rules: neRules, now: new Date('2026-10-26T08:00:00Z'), busyPeriods: [busyMorning] })), '2026-10-26');
    // 09:00–12:00 minus busy 06:15–12:00 → nothing left
    expect(slots).toEqual([]);
    const free = onDay(computeAvailableSlots(base({ rules: neRules, now: new Date('2026-10-26T08:00:00Z') })), '2026-10-26');
    expect(free).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('respects min_booking_buffer_hours', () => {
    // 10:00 MDT now + 2h buffer → first slot strictly after 12:00
    const slots = onDay(computeAvailableSlots(base({ now: new Date('2026-10-26T16:00:00Z') })), '2026-10-26');
    expect(slots[0]).toBe('12:30');
  });

  it('respects co_blocked_dates and add/block custom times', () => {
    const slots = computeAvailableSlots(base({
      blockedDates: new Set(['2026-10-27']),
      customTimes: [
        { custom_date: '2026-10-31', start_time: '10:00', end_time: '11:00', mode: 'add' }, // Saturday extra
        { custom_date: '2026-10-28', start_time: '11:00', end_time: '17:00', mode: 'block' },
      ],
    }));
    expect(onDay(slots, '2026-10-27')).toEqual([]);
    expect(onDay(slots, '2026-10-28')).toEqual([]);
    expect(onDay(slots, '2026-10-31')).toEqual(['10:00', '10:30']);
  });

  it('keeps Calgary wall times across the Nov 1 DST change', () => {
    const slots = computeAvailableSlots(base());
    expect(onDay(slots, '2026-11-02')[0]).toBe('11:00');
    expect(slots).toContain('2026-11-02T18:00:00.000Z');
  });
});
