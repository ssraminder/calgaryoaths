// Slot availability API — generates bookable time slots from availability rules,
// applies date overrides (add extra time or block time windows), filters blocked dates,
// booked slots, and buffer hours. Future-ready for calendar integration (Google/M365).
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;
const DEFAULT_BUFFER_HOURS = 4;

function calgaryOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === now.getTimezoneOffset();
  return isDST ? -6 : -7;
}

type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function generateSlotsForDay(
  dateStr: string,
  rules: AvailabilityRule[],
  slotMinutes: number
): string[] {
  const offset = calgaryOffset();
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);
  if (dayRules.length === 0) return [];

  const slots: string[] = [];
  for (const rule of dayRules) {
    const [startH, startM] = rule.start_time.split(':').map(Number);
    const [endH, endM] = rule.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + slotMinutes <= endMinutes; m += slotMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const utcH = h - offset;
      const slotDate = new Date(Date.UTC(year, month - 1, day, utcH, min, 0));
      slots.push(slotDate.toISOString());
    }
  }

  return slots;
}

/** Convert a Calgary-local HH:MM + date string to a UTC ISO string */
function localTimeToUtc(dateStr: string, time: string): Date {
  const offset = calgaryOffset();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, h - offset, m, 0));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commissionerId = searchParams.get('commissionerId');
  const startDate = searchParams.get('startDate');
  const locationId = searchParams.get('locationId');

  if (!commissionerId || !startDate) {
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
  const availRules = (rules ?? []) as AvailabilityRule[];

  // Blocked dates (full-day blocks)
  const { data: blockedDatesData } = await supabaseAdmin
    .from('co_blocked_dates')
    .select('blocked_date')
    .eq('commissioner_id', commissionerId)
    .gte('blocked_date', startDate);
  const blockedDates = new Set((blockedDatesData ?? []).map((b) => b.blocked_date));

  // Date overrides: both 'add' (extra time) and 'block' (remove time windows)
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const base = new Date(sy, sm - 1, sd);
  const windowEnd = new Date(base);
  windowEnd.setDate(windowEnd.getDate() + DAYS_AHEAD);
  const endDateStr = windowEnd.toISOString().slice(0, 10);

  // Date overrides (table may not exist yet if migration hasn't run)
  let customTimesData: { custom_date: string; start_time: string; end_time: string; mode: string }[] = [];
  try {
    const { data: ctData, error: ctError } = await supabaseAdmin
      .from('co_custom_times')
      .select('custom_date, start_time, end_time, mode')
      .eq('commissioner_id', commissionerId)
      .gte('custom_date', startDate)
      .lte('custom_date', endDateStr);
    if (!ctError && ctData) customTimesData = ctData;
  } catch { /* table may not exist yet */ }

  // Separate add vs block overrides, grouped by date
  const addOverrides = new Map<string, { start_time: string; end_time: string }[]>();
  const blockOverrides = new Map<string, { start_time: string; end_time: string }[]>();
  for (const ct of customTimesData) {
    const map = ct.mode === 'block' ? blockOverrides : addOverrides;
    if (!map.has(ct.custom_date)) map.set(ct.custom_date, []);
    map.get(ct.custom_date)!.push({ start_time: ct.start_time, end_time: ct.end_time });
  }

  // Generate candidate slots from regular availability rules
  const allSlots: string[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (blockedDates.has(dateStr)) continue;

    // Regular rule slots
    allSlots.push(...generateSlotsForDay(dateStr, availRules, SLOT_MINUTES));

    // Extra slots from 'add' overrides
    const extras = addOverrides.get(dateStr);
    if (extras) {
      for (const ex of extras) {
        const customRule: AvailabilityRule = {
          day_of_week: d.getDay(),
          start_time: ex.start_time,
          end_time: ex.end_time,
        };
        allSlots.push(...generateSlotsForDay(dateStr, [customRule], SLOT_MINUTES));
      }
    }
  }

  // Filter out past slots (buffer hours from now)
  const cutoff = new Date(Date.now() + bufferHours * 60 * 60 * 1000);
  let available = allSlots.filter((s) => new Date(s) > cutoff);

  // Deduplicate
  available = [...new Set(available)];

  // Remove slots that fall within 'block' override windows
  if (blockOverrides.size > 0) {
    available = available.filter((slotIso) => {
      const slotTime = new Date(slotIso);
      // Check each date's block windows
      for (const [dateStr, blocks] of blockOverrides) {
        for (const block of blocks) {
          const blockStart = localTimeToUtc(dateStr, block.start_time);
          const blockEnd = localTimeToUtc(dateStr, block.end_time);
          if (slotTime >= blockStart && slotTime < blockEnd) {
            return false; // slot falls within a blocked time window
          }
        }
      }
      return true;
    });
  }

  // Filter out booked slots from DB (across ALL locations for this commissioner)
  // Stale pending_payment bookings (abandoned checkout > 30 min) don't block slots
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: booked } = await supabaseAdmin
    .from('co_bookings')
    .select('appointment_datetime')
    .eq('commissioner_id', commissionerId)
    .not('appointment_datetime', 'is', null)
    .or(`status.in.(paid,confirmed),and(status.eq.pending_payment,updated_at.gt.${staleThreshold})`)
    .gte('appointment_datetime', base.toISOString())
    .lte('appointment_datetime', windowEnd.toISOString());

  const bookedSet = new Set(
    (booked ?? []).map((b) => new Date(b.appointment_datetime).getTime())
  );
  available = available.filter((s) => !bookedSet.has(new Date(s).getTime()));

  // Calendar integration — filter out slots that overlap with external calendar busy times.
  // Busy times are synced into co_custom_times with source='calendar' by the sync job,
  // so they're already handled by the blockOverrides logic above.
  // As a real-time fallback, also query connected calendars directly for fresh busy times.
  try {
    const { data: calConns } = await supabaseAdmin
      .from('co_calendar_connections')
      .select('*')
      .eq('commissioner_id', commissionerId)
      .eq('sync_enabled', true)
      .eq('pull_busy_times', true);

    if (calConns && calConns.length > 0) {
      const { getBusyTimes, ensureFreshToken } = await import('@/lib/calendar-providers');
      type CC = import('@/lib/calendar-providers').CalendarConnection;

      for (const conn of calConns as CC[]) {
        try {
          const freshTokens = await ensureFreshToken(conn);
          if (freshTokens) {
            await supabaseAdmin
              .from('co_calendar_connections')
              .update({
                access_token: freshTokens.access_token,
                refresh_token: freshTokens.refresh_token,
                token_expires_at: freshTokens.token_expires_at,
              })
              .eq('id', conn.id);
            conn.access_token = freshTokens.access_token;
          }

          const busyPeriods = await getBusyTimes(conn, base.toISOString(), windowEnd.toISOString());
          available = available.filter((slotIso) => {
            const slotStart = new Date(slotIso).getTime();
            const slotEnd = slotStart + SLOT_MINUTES * 60 * 1000;
            return !busyPeriods.some((busy) => {
              const busyStart = new Date(busy.start).getTime();
              const busyEnd = new Date(busy.end).getTime();
              return slotStart < busyEnd && slotEnd > busyStart;
            });
          });
        } catch (calErr) {
          console.error(`Calendar busy time fetch failed for ${conn.provider}:`, calErr);
          // Non-blocking — slots still returned even if calendar fetch fails
        }
      }
    }
  } catch { /* co_calendar_connections table may not exist yet */ }

  return NextResponse.json({ slots: available });
}
