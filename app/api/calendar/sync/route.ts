// Calendar sync API — refreshes tokens, pulls busy times from connected calendars into
// co_custom_times (mode='block', source='calendar'), and backfills calendar events for
// confirmed bookings that never made it to the calendar.
//
// Called every 15 minutes by the Netlify scheduled function netlify/functions/calendar-sync.mts
// (Authorization: Bearer $CRON_SECRET → all connections), or by a vendor's "Sync Now"
// button (their own connections only).
import { NextRequest, NextResponse } from 'next/server';
import { runCalendarSync } from '@/lib/calendar-sync';
import { isCronRequest } from '@/lib/cron-auth';
import { verifyVendor } from '@/lib/vendor-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function POST(req: NextRequest) {
  if (isCronRequest(req)) {
    const summary = await runCalendarSync();
    console.log(
      `[calendar] scheduled sync: ${summary.connections} connection(s), ${summary.totalBlocks} block(s), ` +
      `backfill ${JSON.stringify(summary.backfill)}, ${summary.errors} error(s)`
    );
    return NextResponse.json({
      synced: summary.connections,
      totalBlocks: summary.totalBlocks,
      pushedBookings: summary.backfill.created + summary.backfill.adopted,
      errors: summary.errors,
      details: summary.details,
    });
  }

  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const summary = await runCalendarSync({ commissionerId: vendor.commissionerId });
  return NextResponse.json({
    synced: summary.connections,
    totalBlocks: summary.totalBlocks,
    pushedBookings: summary.backfill.created + summary.backfill.adopted,
    errors: summary.errors,
    details: summary.details.map(({ connectionId, provider, status, blocks }) => ({ connectionId, provider, status, blocks })),
  });
}
