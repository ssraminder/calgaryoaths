/**
 * Shared tail of the Google/Microsoft OAuth callbacks: store the connection,
 * replace any older connection for the same provider, and run a first sync.
 */
import { supabaseAdmin } from '@/lib/supabase-server';
import type { CalendarConnection, TokenSet } from '@/lib/calendar-providers';
import { clearSyncedBlocks, runCalendarSync } from '@/lib/calendar-sync';

export async function saveOAuthConnection(
  commissionerId: string,
  provider: 'google' | 'microsoft',
  calendar: { id: string; name: string },
  tokens: TokenSet
): Promise<void> {
  const { data: saved, error } = await supabaseAdmin
    .from('co_calendar_connections')
    .upsert(
      {
        commissioner_id: commissionerId,
        provider,
        calendar_id: calendar.id,
        display_name: calendar.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.token_expires_at,
        sync_enabled: true,
        push_bookings: true,
        pull_busy_times: true,
        // Reconnecting clears any "needs reconnect" / error state
        status: 'active',
        last_error: null,
        last_error_at: null,
        last_alerted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'commissioner_id,provider,calendar_id' }
    )
    .select('id')
    .single();
  if (error || !saved) throw new Error(`Saving ${provider} connection failed: ${error?.message}`);

  // Reconnecting with a different account replaces the old connection rather than adding a second one
  const { data: stale } = await supabaseAdmin
    .from('co_calendar_connections')
    .select('id, commissioner_id')
    .eq('commissioner_id', commissionerId)
    .eq('provider', provider)
    .neq('id', saved.id);
  for (const old of (stale ?? []) as Pick<CalendarConnection, 'id' | 'commissioner_id'>[]) {
    await clearSyncedBlocks(old);
    await supabaseAdmin.from('co_calendar_connections').delete().eq('id', old.id);
  }

  // First sync so busy times and upcoming bookings show up immediately
  try {
    await runCalendarSync({ commissionerId });
  } catch (err) {
    console.error(`[calendar] initial sync after ${provider} connect failed:`, err);
  }
}
