// Backfill calendar events for future confirmed/paid bookings that have none yet.
// Idempotent: bookings already linked to an event are skipped, and an existing event
// at the same start time (e.g. added by hand) is adopted instead of duplicated.
//
//   POST /api/calendar/backfill?dryRun=true   → report only, changes nothing
//   POST /api/calendar/backfill               → push
// Auth: CRON_SECRET bearer token (all commissioners, optional ?commissionerId=)
// or a logged-in vendor (their own bookings).
import { NextRequest, NextResponse } from 'next/server';
import { backfillBookingCalendarEvents } from '@/lib/calendar-sync';
import { isCronRequest } from '@/lib/cron-auth';
import { verifyVendor } from '@/lib/vendor-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function POST(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

  let commissionerId: string | undefined;
  if (isCronRequest(req)) {
    commissionerId = req.nextUrl.searchParams.get('commissionerId') || undefined;
  } else {
    const vendor = await verifyVendor(req);
    if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    commissionerId = vendor.commissionerId;
  }

  const result = await backfillBookingCalendarEvents({ commissionerId, dryRun });
  return NextResponse.json({ dryRun, ...result });
}
