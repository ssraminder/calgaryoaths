import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * True if the request carries the CRON_SECRET, as `Authorization: Bearer <secret>`
 * (preferred — query strings end up in access logs) or legacy `?secret=`.
 */
export function isCronRequest(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  const provided = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : req.nextUrl.searchParams.get('secret');
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
