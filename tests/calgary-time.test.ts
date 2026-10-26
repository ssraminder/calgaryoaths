import { describe, it, expect } from 'vitest';
import { addDays, calgaryDateStr, calgaryLocalToUtc, calgaryTimeStr, dayOfWeek } from '@/lib/calgary-time';

describe('calgary-time', () => {
  it('converts Calgary wall time to UTC in MDT and MST', () => {
    expect(calgaryLocalToUtc('2026-10-26', '11:00').toISOString()).toBe('2026-10-26T17:00:00.000Z'); // MDT -6
    expect(calgaryLocalToUtc('2026-11-02', '11:00').toISOString()).toBe('2026-11-02T18:00:00.000Z'); // MST -7
  });

  it('handles the DST-end day (Nov 1 2026) and 24:00', () => {
    expect(calgaryLocalToUtc('2026-11-01', '00:00').toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(calgaryLocalToUtc('2026-11-01', '12:00').toISOString()).toBe('2026-11-01T19:00:00.000Z');
    expect(calgaryLocalToUtc('2026-10-26', '24:00').toISOString()).toBe('2026-10-27T06:00:00.000Z');
  });

  it('accepts HH:MM:SS as stored in co_availability_rules', () => {
    expect(calgaryLocalToUtc('2026-10-26', '11:00:00').toISOString()).toBe('2026-10-26T17:00:00.000Z');
  });

  it('formats instants as Calgary date/time', () => {
    const d = new Date('2026-10-27T05:30:00Z'); // 23:30 MDT on the 26th
    expect(calgaryDateStr(d)).toBe('2026-10-26');
    expect(calgaryTimeStr(d)).toBe('23:30');
    expect(calgaryTimeStr(new Date('2026-10-26T06:00:00Z'))).toBe('00:00'); // never "24:00"
  });

  it('does date arithmetic without the server timezone', () => {
    const before = process.env.TZ;
    process.env.TZ = 'Pacific/Auckland';
    try {
      expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
      expect(dayOfWeek('2026-10-26')).toBe(1); // Monday
      expect(calgaryLocalToUtc('2026-10-26', '11:00').toISOString()).toBe('2026-10-26T17:00:00.000Z');
    } finally {
      process.env.TZ = before;
    }
  });
});
