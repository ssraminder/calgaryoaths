/**
 * America/Edmonton date/time helpers that don't depend on the server's own
 * timezone (Netlify runs in UTC) and handle DST transitions per date.
 */

export const CALGARY_TZ = 'America/Edmonton';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALGARY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function calgaryParts(date: Date) {
  const parts: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of Calgary from UTC at the given instant, in minutes (e.g. -360 for MDT). */
export function calgaryOffsetMinutes(date: Date): number {
  const p = calgaryParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** YYYY-MM-DD of the instant in Calgary. */
export function calgaryDateStr(date: Date): string {
  const p = calgaryParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** HH:MM (24h) of the instant in Calgary. */
export function calgaryTimeStr(date: Date): string {
  const p = calgaryParts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * Calgary wall-clock date + time → UTC instant. `time` is HH:MM or HH:MM:SS;
 * "24:00" means midnight at the end of that day.
 */
export function calgaryLocalToUtc(dateStr: string, time: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Two passes: the offset can differ between the naive guess and the real instant around DST changes
  let guess = wallAsUtc - calgaryOffsetMinutes(new Date(wallAsUtc)) * 60000;
  guess = wallAsUtc - calgaryOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday) of a YYYY-MM-DD calendar date. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
