// Slot availability API — generates bookable time slots from availability rules,
// applies date overrides (add extra time or block time windows), filters blocked dates,
// booked slots, buffer hours, and busy times from the vendor's connected calendars.
//
// Calendar busy times come from two layers:
//  1. co_custom_times rows with source='calendar', written by the scheduled sync
//     (every 15 min). These are always applied, so they act as the fallback.
//  2. A live provider query on each request, for anything newer than the last sync.
// If the live query fails we still answer (customers must always get slots), but the
// failure is logged with context and recorded on the connection; permanent auth
// failures flag the connection for reconnect and alert the commissioner.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  AvailabilityRule,
  CustomTime,
  TimeRange,
  computeAvailableSlots,
  slotWindow,
} from '@/lib/slots';

const DEFAULT_BUFFER_HOURS = 4;
/** Don't let a slow calendar provider hold up the booking page. */
const LIVE_CALENDAR_TIMEOUT_MS = 4000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commissionerId = searchParams.get('commissionerId');
  const startDate = searchParams.get('startDate');
  const locationId = searchParams.get('locationId');

  if (!commissionerId || !startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: 'Missing commissionerId or startDate' }, { status: 400 });
  }

  // Get buffer hours: vendor-specific → global setting → default
  const { data: commData } = await supabaseAdmin
    .from('co_commissioners')
    .select('min_booking_buffer_hours')
    .eq('id', commissionerId)
    .single();
  let bufferHours = commData?.min_booking_buffer_hours;
  if (bufferHours == null) {
    const { data: bufferSetting } = await supabaseAdmin
      .from('co_settings')
      .select('value')
      .eq('key', 'min_booking_buffer_hours')
      .single();
    bufferHours = parseInt(bufferSetting?.value || String(DEFAULT_BUFFER_HOURS), 10);
  }

  // Fetch availability rules — filter by location if provided
  let rulesQuery = supabaseAdmin
    .from('co_availability_rules')
    .select('day_of_week, start_time, end_time')
    .eq('commissioner_id', commissionerId)
    .eq('active', true);

  if (locationId) {
    rulesQuery = rulesQuery.eq('location_id', locationId);
  }

  const { data: rules } = await rulesQuery;

  // Blocked dates (full-day blocks)
  const { data: blockedDatesData } = await supabaseAdmin
    .from('co_blocked_dates')
    .select('blocked_date')
    .eq('commissioner_id', commissionerId)
    .gte('blocked_date', startDate);

  const window = slotWindow(startDate);

  // Date overrides: 'add' (extra time) and 'block' (manual blocks + calendar-synced busy times)
  let customTimes: CustomTime[] = [];
  try {
    const { data: ctData, error: ctError } = await supabaseAdmin
      .from('co_custom_times')
      .select('custom_date, start_time, end_time, mode')
      .eq('commissioner_id', commissionerId)
      .gte('custom_date', startDate)
      .lte('custom_date', window.lastDate);
    if (!ctError && ctData) customTimes = ctData;
  } catch { /* table may not exist yet */ }

  // Booked slots across ALL locations for this commissioner.
  // Stale pending_payment bookings (abandoned checkout > 10 min) don't block slots.
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: booked } = await supabaseAdmin
    .from('co_bookings')
    .select('appointment_datetime')
    .eq('commissioner_id', commissionerId)
    .not('appointment_datetime', 'is', null)
    .or(`status.in.(paid,confirmed),and(status.eq.pending_payment,updated_at.gt.${staleThreshold})`)
    .gte('appointment_datetime', window.startUtc.toISOString())
    .lte('appointment_datetime', window.endUtc.toISOString());

  const busyPeriods = await liveBusyTimes(
    commissionerId,
    window.startUtc.toISOString(),
    window.endUtc.toISOString(),
    { locationId, startDate }
  );

  const slots = computeAvailableSlots({
    startDate,
    now: new Date(),
    bufferHours,
    rules: (rules ?? []) as AvailabilityRule[],
    blockedDates: new Set((blockedDatesData ?? []).map((b) => b.blocked_date)),
    customTimes,
    bookedTimes: (booked ?? []).map((b) => b.appointment_datetime),
    busyPeriods,
  });

  return NextResponse.json({ slots });
}

/** Live busy periods from every pull-enabled, healthy connection. Never throws. */
async function liveBusyTimes(
  commissionerId: string,
  timeMin: string,
  timeMax: string,
  ctx: { locationId: string | null; startDate: string }
): Promise<TimeRange[]> {
  let connections;
  try {
    const { data } = await supabaseAdmin
      .from('co_calendar_connections')
      .select('*')
      .eq('commissioner_id', commissionerId)
      .eq('sync_enabled', true)
      .eq('pull_busy_times', true);
    connections = data;
  } catch {
    return []; // co_calendar_connections table may not exist yet
  }
  if (!connections || connections.length === 0) return [];

  const { getBusyTimes } = await import('@/lib/calendar-providers');
  const { withFreshToken, recordConnectionError, isConnectionBroken, markConnectionHealthy } =
    await import('@/lib/calendar-connections');
  type CC = import('@/lib/calendar-providers').CalendarConnection;

  const results = await Promise.all(
    (connections as CC[]).map(async (conn) => {
      // Already flagged: rely on the synced co_custom_times rows instead of a call we know fails.
      // The scheduled sync keeps retrying and clears the flag once it works again.
      if (isConnectionBroken(conn)) return [];
      try {
        const busy = await withTimeout(
          (async () => {
            await withFreshToken(conn);
            return getBusyTimes(conn, timeMin, timeMax);
          })(),
          LIVE_CALENDAR_TIMEOUT_MS
        );
        await markConnectionHealthy(conn);
        return busy;
      } catch (err) {
        await recordConnectionError(
          conn,
          err,
          `live busy-time fetch for slots (location=${ctx.locationId ?? 'any'}, startDate=${ctx.startDate})`
        );
        return [];
      }
    })
  );
  return results.flat();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}
