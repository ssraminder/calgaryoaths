/**
 * Two-way sync between bookings and vendors' connected calendars.
 *
 *  - Push: syncBookingCalendarEvents() reconciles one booking with every
 *    push-enabled connection. Confirmed/paid bookings get an event (created, or
 *    moved if the time changed); anything else has its events deleted. Event IDs
 *    live in co_bookings.calendar_events keyed by connection ID, so it's safe to
 *    call after any booking change, any number of times.
 *  - Pull: syncBusyTimesForConnection() copies busy periods into co_custom_times
 *    (mode='block', source='calendar') so slots stay blocked even when the
 *    provider is slow or down.
 *  - runCalendarSync() is the scheduled job: refresh tokens, pull busy times,
 *    and backfill events for bookings that never made it to the calendar.
 */
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  CalendarConnection,
  CalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  findEventStartingAt,
  getBusyTimes,
  updateCalendarEvent,
} from '@/lib/calendar-providers';
import {
  isConnectionBroken,
  markConnectionHealthy,
  recordConnectionError,
  withFreshToken,
} from '@/lib/calendar-connections';
import { busyPeriodsToBlocks, calendarBlockReason } from '@/lib/calendar-blocks';
import { calgaryDateStr } from '@/lib/calgary-time';

/** Booking statuses that hold a time in the commissioner's calendar. */
export const CALENDAR_ACTIVE_STATUSES = ['confirmed', 'paid'];
/** Statuses whose calendar event should be removed. Anything else (completed,
 *  pending_cancellation, pending_scheduling…) leaves an existing event alone. */
export const CALENDAR_REMOVE_STATUSES = ['cancelled', 'refunded'];
const APPOINTMENT_MINUTES = 30;
/** How far ahead busy times are pulled. Customers can browse beyond the first 14 days. */
const PULL_DAYS_AHEAD = 60;
/** Backfill skips bookings touched this recently so it can't race a confirm that's still pushing. */
const BACKFILL_SETTLE_MS = 5 * 60 * 1000;

export type CalendarEventRef = {
  provider: string;
  event_id: string;
  start: string;
  /** Matched to an event someone made by hand — never edited or deleted by us. */
  adopted?: boolean;
};

export type BookingForCalendar = {
  id: string;
  commissioner_id: string | null;
  status: string;
  appointment_datetime: string | null;
  updated_at?: string | null;
  service_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  delivery_mode: string | null;
  customer_address: string | null;
  location_id: string | null;
  calendar_events?: Record<string, CalendarEventRef> | null;
};

export type BookingSyncResult = {
  created: number;
  updated: number;
  deleted: number;
  adopted: number;
  unchanged: number;
  skipped: number;
  failed: number;
};

function emptyResult(): BookingSyncResult {
  return { created: 0, updated: 0, deleted: 0, adopted: 0, unchanged: 0, skipped: 0, failed: 0 };
}

function addResults(a: BookingSyncResult, b: BookingSyncResult): BookingSyncResult {
  return {
    created: a.created + b.created,
    updated: a.updated + b.updated,
    deleted: a.deleted + b.deleted,
    adopted: a.adopted + b.adopted,
    unchanged: a.unchanged + b.unchanged,
    skipped: a.skipped + b.skipped,
    failed: a.failed + b.failed,
  };
}

/** Event contents for a booking: title, customer, service, location and contact details. */
export function buildBookingEvent(
  booking: BookingForCalendar,
  location: { name?: string | null; address?: string | null } | null
): CalendarEvent {
  const start = new Date(booking.appointment_datetime!);
  const end = new Date(start.getTime() + APPOINTMENT_MINUTES * 60 * 1000);
  const isMobile = booking.delivery_mode === 'mobile';
  const where = isMobile
    ? booking.customer_address || 'Mobile service'
    : location?.address || 'Calgary, AB';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calgaryoaths.com';

  const lines = [
    `Customer: ${booking.name || ''}`,
    `Service: ${booking.service_name || ''}`,
    `Phone: ${booking.phone || ''}`,
    `Email: ${booking.email || ''}`,
    `Location: ${isMobile ? `Mobile — ${where}` : `${location?.name ? `${location.name}, ` : ''}${where}`}`,
  ];
  if (booking.notes) lines.push(`Notes: ${booking.notes}`);
  lines.push('', `Booking: ${siteUrl}/vendor/bookings/${booking.id}`);

  return {
    title: `${booking.service_name || 'Appointment'} — ${booking.name || 'Customer'}`,
    description: lines.join('\n'),
    location: where,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

async function loadLocation(booking: BookingForCalendar) {
  if (booking.location_id) {
    const { data } = await supabaseAdmin
      .from('co_locations')
      .select('name, address')
      .eq('id', booking.location_id)
      .maybeSingle();
    if (data) return data as { name: string | null; address: string | null };
  }
  if (booking.commissioner_id) {
    const { data } = await supabaseAdmin
      .from('co_commissioners')
      .select('address')
      .eq('id', booking.commissioner_id)
      .maybeSingle();
    if (data) return { name: null, address: (data as { address: string | null }).address };
  }
  return null;
}

function sameMinute(a: string, b: string): boolean {
  return Math.floor(new Date(a).getTime() / 60000) === Math.floor(new Date(b).getTime() / 60000);
}

type SyncBookingOptions = {
  /** Before creating, look for an event at the same start (hand-made or a lost write) and adopt it. */
  adoptExisting?: boolean;
  /** Report what would happen without touching any calendar or the booking row. */
  dryRun?: boolean;
  /** Preloaded connections (backfill reuses them across bookings). */
  connections?: CalendarConnection[];
};

/**
 * Bring a booking's calendar events in line with the booking. Never throws:
 * provider failures are recorded on the connection and counted in the result.
 */
export async function syncBookingCalendarEvents(
  bookingOrId: string | BookingForCalendar,
  opts: SyncBookingOptions = {}
): Promise<BookingSyncResult> {
  const result = emptyResult();
  try {
    let booking: BookingForCalendar | null;
    if (typeof bookingOrId === 'string') {
      const { data } = await supabaseAdmin.from('co_bookings').select('*').eq('id', bookingOrId).maybeSingle();
      booking = data as BookingForCalendar | null;
    } else {
      booking = bookingOrId;
    }
    if (!booking?.commissioner_id) return result;

    let connections = opts.connections;
    if (!connections) {
      const { data } = await supabaseAdmin
        .from('co_calendar_connections')
        .select('*')
        .eq('commissioner_id', booking.commissioner_id);
      connections = (data ?? []) as CalendarConnection[];
    }

    const refs: Record<string, CalendarEventRef> = { ...(booking.calendar_events || {}) };
    let changed = false;
    const shouldExist =
      CALENDAR_ACTIVE_STATUSES.includes(booking.status) && !!booking.appointment_datetime;
    const shouldRemove = CALENDAR_REMOVE_STATUSES.includes(booking.status);
    if (!shouldExist && !shouldRemove) return result;
    const location = shouldExist ? await loadLocation(booking) : null;
    const event = shouldExist ? buildBookingEvent(booking, location) : null;

    // Forget refs for connections that were disconnected
    for (const connId of Object.keys(refs)) {
      if (!connections.some((c) => c.id === connId)) {
        delete refs[connId];
        changed = true;
      }
    }

    for (const conn of connections) {
      const ref = refs[conn.id];
      if (!conn.sync_enabled || !conn.push_bookings) {
        result.skipped++;
        continue;
      }
      if (shouldExist && ref && !ref.adopted && sameMinute(ref.start, event!.startTime)) {
        result.unchanged++;
        continue;
      }
      if (shouldExist && ref?.adopted && sameMinute(ref.start, event!.startTime)) {
        result.unchanged++;
        continue;
      }
      if (!shouldExist && !ref) {
        result.unchanged++;
        continue;
      }
      if (isConnectionBroken(conn)) {
        // Skip until reconnected; the scheduled backfill catches up afterwards
        result.skipped++;
        continue;
      }

      try {
        await withFreshToken(conn);

        if (shouldExist) {
          if (ref && !ref.adopted) {
            // Rescheduled: move our event
            if (!opts.dryRun) {
              const newId = await updateCalendarEvent(conn, ref.event_id, event!);
              refs[conn.id] = { provider: conn.provider, event_id: newId, start: event!.startTime };
              changed = true;
            }
            result.updated++;
          } else {
            // No event yet (or only a hand-made one at the old time, which we leave alone)
            const existingId = opts.adoptExisting ? await findEventStartingAt(conn, event!.startTime) : null;
            if (existingId) {
              if (!opts.dryRun) {
                refs[conn.id] = { provider: conn.provider, event_id: existingId, start: event!.startTime, adopted: true };
                changed = true;
              }
              result.adopted++;
            } else {
              if (!opts.dryRun) {
                const newId = await createCalendarEvent(conn, event!);
                refs[conn.id] = { provider: conn.provider, event_id: newId, start: event!.startTime };
                changed = true;
              }
              result.created++;
            }
          }
        } else if (ref) {
          // Cancelled / no longer scheduled: remove our event, never a hand-made one
          if (!opts.dryRun) {
            if (!ref.adopted) await deleteCalendarEvent(conn, ref.event_id);
            delete refs[conn.id];
            changed = true;
          }
          result.deleted++;
        }
        if (!opts.dryRun) await markConnectionHealthy(conn);
      } catch (err) {
        result.failed++;
        await recordConnectionError(conn, err, `booking ${booking.id} calendar push`);
      }
    }

    if (changed && !opts.dryRun) {
      const { error } = await supabaseAdmin
        .from('co_bookings')
        .update({ calendar_events: refs })
        .eq('id', booking.id);
      if (error) console.error(`[calendar] failed to save event IDs on booking ${booking.id}:`, error.message);
    }
  } catch (err) {
    result.failed++;
    console.error('[calendar] syncBookingCalendarEvents error:', err);
  }
  return result;
}

/**
 * Push future confirmed/paid bookings that have no event yet. Idempotent: an
 * existing event at the same start (e.g. one added by hand) is adopted instead
 * of duplicated.
 */
export async function backfillBookingCalendarEvents(
  opts: { commissionerId?: string; dryRun?: boolean } = {}
): Promise<BookingSyncResult & { bookings: number }> {
  // Load every connection (not just push-enabled ones) so refs for connections
  // with push turned off aren't mistaken for disconnected calendars
  let query = supabaseAdmin.from('co_calendar_connections').select('*');
  if (opts.commissionerId) query = query.eq('commissioner_id', opts.commissionerId);
  const { data: connData } = await query;
  const connections = (connData ?? []) as CalendarConnection[];

  const byCommissioner = new Map<string, CalendarConnection[]>();
  for (const c of connections) {
    if (!byCommissioner.has(c.commissioner_id)) byCommissioner.set(c.commissioner_id, []);
    byCommissioner.get(c.commissioner_id)!.push(c);
  }

  let total = emptyResult();
  let bookingsTouched = 0;
  const settledBefore = new Date(Date.now() - BACKFILL_SETTLE_MS).toISOString();

  for (const [commissionerId, conns] of byCommissioner) {
    const pushConns = conns.filter((c) => c.sync_enabled && c.push_bookings);
    if (pushConns.length === 0) continue;
    const { data: bookings } = await supabaseAdmin
      .from('co_bookings')
      .select('*')
      .eq('commissioner_id', commissionerId)
      .in('status', CALENDAR_ACTIVE_STATUSES)
      .gte('appointment_datetime', new Date().toISOString())
      .lt('updated_at', settledBefore)
      .order('appointment_datetime', { ascending: true });

    for (const booking of (bookings ?? []) as BookingForCalendar[]) {
      const refs = booking.calendar_events || {};
      if (pushConns.every((c) => refs[c.id])) continue;
      bookingsTouched++;
      const r = await syncBookingCalendarEvents(booking, {
        adoptExisting: true,
        dryRun: opts.dryRun,
        connections: conns,
      });
      total = addResults(total, r);
    }

    // Cancelled bookings whose event couldn't be deleted at the time (e.g. connection was broken)
    const { data: stale } = await supabaseAdmin
      .from('co_bookings')
      .select('*')
      .eq('commissioner_id', commissionerId)
      .in('status', CALENDAR_REMOVE_STATUSES)
      .neq('calendar_events', '{}')
      .lt('updated_at', settledBefore);
    for (const booking of (stale ?? []) as BookingForCalendar[]) {
      bookingsTouched++;
      const r = await syncBookingCalendarEvents(booking, { dryRun: opts.dryRun, connections: conns });
      total = addResults(total, r);
    }
  }
  return { ...total, bookings: bookingsTouched };
}

/** Remove busy blocks this connection synced (plus legacy untagged calendar rows). */
export async function clearSyncedBlocks(conn: Pick<CalendarConnection, 'id' | 'commissioner_id'>): Promise<void> {
  await supabaseAdmin
    .from('co_custom_times')
    .delete()
    .eq('commissioner_id', conn.commissioner_id)
    .eq('source', 'calendar')
    .eq('reason', calendarBlockReason(conn.id));
  // Rows written before blocks were tagged with a connection ID
  await supabaseAdmin
    .from('co_custom_times')
    .delete()
    .eq('commissioner_id', conn.commissioner_id)
    .eq('source', 'calendar')
    .not('reason', 'like', 'calendar:%');
}

/** Pull busy times for one connection into co_custom_times and stamp last_synced_at. */
export async function syncBusyTimesForConnection(conn: CalendarConnection): Promise<number> {
  await withFreshToken(conn);

  const now = new Date();
  const until = new Date(now.getTime() + PULL_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const busy = await getBusyTimes(conn, now.toISOString(), until.toISOString());
  const rows = busyPeriodsToBlocks(busy, conn.commissioner_id, conn.id)
    .filter((r) => r.custom_date >= calgaryDateStr(now));

  // Only replace rows once the provider call has succeeded, so a failure keeps the last good copy
  await clearSyncedBlocks(conn);
  if (rows.length > 0) {
    // ignoreDuplicates: never overwrite a manual block that happens to have the same window
    const { error } = await supabaseAdmin.from('co_custom_times').upsert(rows, {
      onConflict: 'commissioner_id,custom_date,start_time,end_time,mode',
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`Saving busy blocks failed: ${error.message}`);
  }

  const nowIso = new Date().toISOString();
  await supabaseAdmin.from('co_calendar_connections').update({ last_synced_at: nowIso }).eq('id', conn.id);
  conn.last_synced_at = nowIso;
  await markConnectionHealthy(conn);
  return rows.length;
}

export type CalendarSyncSummary = {
  connections: number;
  totalBlocks: number;
  errors: number;
  backfill: BookingSyncResult & { bookings: number };
  details: { connectionId: string; provider: string; status: string; blocks?: number; error?: string }[];
};

/**
 * The scheduled job (and the vendor "Sync Now" button): for every enabled
 * connection, refresh the token, pull busy times if enabled, then backfill
 * bookings missing from the calendar. Broken connections are retried every run,
 * so they recover on their own once the cause (e.g. an expired client secret)
 * is fixed.
 */
export async function runCalendarSync(opts: { commissionerId?: string; backfill?: boolean } = {}): Promise<CalendarSyncSummary> {
  let query = supabaseAdmin.from('co_calendar_connections').select('*').eq('sync_enabled', true);
  if (opts.commissionerId) query = query.eq('commissioner_id', opts.commissionerId);
  const { data } = await query;
  const connections = (data ?? []) as CalendarConnection[];

  const summary: CalendarSyncSummary = {
    connections: connections.length,
    totalBlocks: 0,
    errors: 0,
    backfill: { ...emptyResult(), bookings: 0 },
    details: [],
  };

  for (const conn of connections) {
    try {
      if (conn.pull_busy_times) {
        const blocks = await syncBusyTimesForConnection(conn);
        summary.totalBlocks += blocks;
        summary.details.push({ connectionId: conn.id, provider: conn.provider, status: 'ok', blocks });
      } else {
        // Still refresh so the refresh token stays alive and breakage is noticed early
        await withFreshToken(conn);
        await clearSyncedBlocks(conn);
        await markConnectionHealthy(conn);
        summary.details.push({ connectionId: conn.id, provider: conn.provider, status: 'ok (pull off)' });
      }
    } catch (err) {
      summary.errors++;
      await recordConnectionError(conn, err, 'calendar sync');
      summary.details.push({
        connectionId: conn.id,
        provider: conn.provider,
        status: conn.status || 'error',
        error: conn.last_error || undefined,
      });
    }
  }

  if (opts.backfill !== false) {
    summary.backfill = await backfillBookingCalendarEvents({ commissionerId: opts.commissionerId });
    summary.errors += summary.backfill.failed;
  }
  return summary;
}
