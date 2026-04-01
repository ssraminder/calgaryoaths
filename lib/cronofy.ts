import { supabaseAdmin } from '@/lib/supabase-server';

const CRONOFY_CLIENT_ID = process.env.CRONOFY_CLIENT_ID || '';
const CRONOFY_CLIENT_SECRET = process.env.CRONOFY_CLIENT_SECRET || '';
const CRONOFY_REDIRECT_URI = process.env.CRONOFY_REDIRECT_URI || '';

/** Build OAuth URL for a commissioner to connect their calendar */
export function getCronofyAuthUrl(commissionerId: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CRONOFY_CLIENT_ID,
    redirect_uri: CRONOFY_REDIRECT_URI,
    scope: 'read_write read_free_busy',
    state: commissionerId,
  });
  return `https://app.cronofy.com/oauth/authorize?${params}`;
}

/** Exchange auth code for tokens and save to DB */
export async function exchangeCronofyCode(code: string, commissionerId: string) {
  const res = await fetch('https://api.cronofy.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CRONOFY_CLIENT_ID,
      client_secret: CRONOFY_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: CRONOFY_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cronofy token exchange failed: ${text}`);
  }

  const data = await res.json();

  await supabaseAdmin
    .from('co_commissioners')
    .update({
      cronofy_access_token: data.access_token,
      cronofy_refresh_token: data.refresh_token,
      cronofy_sub: data.sub,
    })
    .eq('id', commissionerId);

  // Get the primary calendar ID
  await syncCronofyCalendars(commissionerId, data.access_token);

  return data;
}

/** Refresh an expired Cronofy access token */
export async function refreshCronofyToken(commissionerId: string, refreshToken: string) {
  const res = await fetch('https://api.cronofy.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CRONOFY_CLIENT_ID,
      client_secret: CRONOFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Cronofy token refresh failed');
  const data = await res.json();

  await supabaseAdmin
    .from('co_commissioners')
    .update({
      cronofy_access_token: data.access_token,
      cronofy_refresh_token: data.refresh_token,
    })
    .eq('id', commissionerId);

  return data.access_token as string;
}

/** Get an active access token, refreshing if needed */
async function getAccessToken(commissionerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('co_commissioners')
    .select('cronofy_access_token, cronofy_refresh_token')
    .eq('id', commissionerId)
    .single();

  if (!data?.cronofy_access_token) return null;

  // Try the current token first — if it fails, refresh
  return data.cronofy_access_token;
}

/** List calendars and save the primary one */
async function syncCronofyCalendars(commissionerId: string, accessToken: string) {
  const res = await fetch('https://api.cronofy.com/v1/calendars', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return;
  const data = await res.json();
  const calendars = data.calendars || [];

  // Use the first writable calendar
  const primary = calendars.find((c: { calendar_readonly: boolean }) => !c.calendar_readonly) || calendars[0];
  if (primary) {
    await supabaseAdmin
      .from('co_commissioners')
      .update({ cronofy_calendar_id: primary.calendar_id })
      .eq('id', commissionerId);
  }
}

/** Get free/busy times from Cronofy for a date range */
export async function getCronofyFreeBusy(
  commissionerId: string,
  from: string,
  to: string
): Promise<{ start: string; end: string }[]> {
  const accessToken = await getAccessToken(commissionerId);
  if (!accessToken) return [];

  const res = await fetch('https://api.cronofy.com/v1/free_busy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tzid: 'America/Edmonton',
      from,
      to,
    }),
  });

  if (!res.ok) {
    // Token might be expired — try refreshing
    const { data } = await supabaseAdmin
      .from('co_commissioners')
      .select('cronofy_refresh_token')
      .eq('id', commissionerId)
      .single();

    if (data?.cronofy_refresh_token) {
      try {
        const newToken = await refreshCronofyToken(commissionerId, data.cronofy_refresh_token);
        const retryRes = await fetch('https://api.cronofy.com/v1/free_busy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tzid: 'America/Edmonton', from, to }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          return (retryData.free_busy || [])
            .filter((e: { free_busy_status: string }) => e.free_busy_status === 'busy')
            .map((e: { start: string; end: string }) => ({ start: e.start, end: e.end }));
        }
      } catch {
        // Calendar sync unavailable
      }
    }
    return [];
  }

  const busyData = await res.json();
  return (busyData.free_busy || [])
    .filter((e: { free_busy_status: string }) => e.free_busy_status === 'busy')
    .map((e: { start: string; end: string }) => ({ start: e.start, end: e.end }));
}

/** Create an event on the commissioner's calendar when a booking is confirmed */
export async function createCronofyEvent(
  commissionerId: string,
  eventId: string,
  summary: string,
  start: string,
  durationMinutes: number
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('co_commissioners')
    .select('cronofy_access_token, cronofy_calendar_id')
    .eq('id', commissionerId)
    .single();

  if (!data?.cronofy_access_token || !data?.cronofy_calendar_id) return false;

  const endTime = new Date(new Date(start).getTime() + durationMinutes * 60000).toISOString();

  const res = await fetch(`https://api.cronofy.com/v1/calendars/${data.cronofy_calendar_id}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.cronofy_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_id: eventId,
      summary,
      start: { tzid: 'America/Edmonton', time: start },
      end: { tzid: 'America/Edmonton', time: endTime },
    }),
  });

  return res.ok;
}
