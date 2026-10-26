import { describe, it, expect } from 'vitest';
import { busyPeriodsToBlocks } from '@/lib/calendar-blocks';

describe('busyPeriodsToBlocks', () => {
  it('maps a same-day busy period to Calgary local times', () => {
    const rows = busyPeriodsToBlocks([{ start: '2026-10-26T12:15:00Z', end: '2026-10-26T18:00:00Z', eventId: 'e1' }], 'raminder-shah', 'conn-1');
    expect(rows).toEqual([expect.objectContaining({
      custom_date: '2026-10-26', start_time: '06:15', end_time: '12:00', mode: 'block', source: 'calendar',
      reason: 'calendar:conn-1', external_event_id: 'e1',
    })]);
  });

  it('splits multi-day / all-day events at Calgary midnight', () => {
    const rows = busyPeriodsToBlocks([{ start: '2026-10-26T06:00:00Z', end: '2026-10-28T06:00:00Z' }], 'c', 'conn');
    expect(rows.map((r) => [r.custom_date, r.start_time, r.end_time])).toEqual([
      ['2026-10-26', '00:00', '24:00'],
      ['2026-10-27', '00:00', '24:00'],
    ]);
  });

  it('drops empty periods and de-duplicates identical windows', () => {
    const rows = busyPeriodsToBlocks([
      { start: '2026-10-26T18:00:00Z', end: '2026-10-26T18:00:00Z' },
      { start: '2026-10-26T18:00:00Z', end: '2026-10-26T19:00:00Z', eventId: 'a' },
      { start: '2026-10-26T18:00:00Z', end: '2026-10-26T19:00:00Z', eventId: 'b' },
    ], 'c', 'conn');
    expect(rows).toHaveLength(1);
  });
});
