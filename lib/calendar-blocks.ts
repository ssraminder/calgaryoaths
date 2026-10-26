/**
 * Convert calendar busy periods into co_custom_times 'block' rows (pure, testable).
 */
import type { BusyPeriod } from '@/lib/calendar-providers';
import { addDays, calgaryDateStr, calgaryLocalToUtc, calgaryTimeStr } from '@/lib/calgary-time';

export type CalendarBlockRow = {
  commissioner_id: string;
  custom_date: string;
  start_time: string;
  end_time: string;
  mode: 'block';
  source: 'calendar';
  reason: string;
  external_event_id: string | null;
};

/** co_custom_times.reason tag that scopes synced rows to one connection. */
export function calendarBlockReason(connectionId: string): string {
  return `calendar:${connectionId}`;
}

/**
 * Split each busy period at Calgary midnights so multi-day and all-day events
 * become one row per day. A period ending exactly at midnight ends at "24:00".
 */
export function busyPeriodsToBlocks(
  periods: BusyPeriod[],
  commissionerId: string,
  connectionId: string
): CalendarBlockRow[] {
  const rows: CalendarBlockRow[] = [];
  const seen = new Set<string>();
  for (const period of periods) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    if (!(end > start)) continue;

    let dateStr = calgaryDateStr(start);
    let segStart = start;
    // Guard against absurdly long events (e.g. multi-month OOF); 62 days covers the sync window
    for (let i = 0; i < 62 && segStart < end; i++) {
      const nextMidnight = calgaryLocalToUtc(addDays(dateStr, 1), '00:00');
      const segEnd = end < nextMidnight ? end : nextMidnight;
      const row: CalendarBlockRow = {
        commissioner_id: commissionerId,
        custom_date: dateStr,
        start_time: calgaryTimeStr(segStart),
        end_time: segEnd.getTime() === nextMidnight.getTime() ? '24:00' : calgaryTimeStr(segEnd),
        mode: 'block',
        source: 'calendar',
        reason: calendarBlockReason(connectionId),
        external_event_id: period.eventId || null,
      };
      // co_custom_times is unique on (commissioner, date, start, end, mode)
      const key = `${row.custom_date}|${row.start_time}|${row.end_time}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
      segStart = nextMidnight;
      dateStr = addDays(dateStr, 1);
    }
  }
  return rows;
}
