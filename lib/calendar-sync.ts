/**
 * Push confirmed bookings to connected vendor calendars.
 */
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  CalendarConnection,
  CalendarEvent,
  ensureFreshToken,
  createCalendarEvent,
} from '@/lib/calendar-providers';

/** Push a booking to all push-enabled calendar connections for a commissioner */
export async function pushBookingToCalendars(
  commissionerId: string,
  event: CalendarEvent
): Promise<string[]> {
  const { data: connections } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('*')
    .eq('commissioner_id', commissionerId)
    .eq('sync_enabled', true)
    .eq('push_bookings', true);

  if (!connections || connections.length === 0) return [];

  const eventIds: string[] = [];

  for (const conn of connections as CalendarConnection[]) {
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

      const eventId = await createCalendarEvent(conn, event);
      eventIds.push(eventId);
    } catch (err) {
      console.error(`Failed to push event to ${conn.provider} calendar:`, err);
    }
  }

  return eventIds;
}
