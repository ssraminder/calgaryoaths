/**
 * Client-side helpers shared by /vendor/calendar and the dashboard calendar card.
 */

export type CalendarConnectionView = {
  id: string;
  provider: 'google' | 'microsoft' | 'apple';
  calendar_id: string;
  display_name: string | null;
  sync_enabled: boolean;
  push_bookings: boolean;
  pull_busy_times: boolean;
  last_synced_at: string | null;
  created_at: string;
  status?: 'active' | 'needs_reconnect' | 'config_error' | null;
  last_error?: string | null;
  last_error_at?: string | null;
};

export const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google Calendar',
  microsoft: 'Outlook',
  apple: 'Apple Calendar',
};

/** A sync older than this is shown as delayed (the scheduled job runs every 15 minutes). */
const STALE_SYNC_MS = 2 * 60 * 60 * 1000;

export type ConnectionHealth = 'ok' | 'stale' | 'needs_reconnect' | 'config_error' | 'paused';

export function connectionHealth(conn: CalendarConnectionView, now = Date.now()): ConnectionHealth {
  if (conn.status === 'needs_reconnect') return 'needs_reconnect';
  if (conn.status === 'config_error') return 'config_error';
  if (!conn.sync_enabled) return 'paused';
  if (conn.pull_busy_times && (!conn.last_synced_at || now - new Date(conn.last_synced_at).getTime() > STALE_SYNC_MS)) {
    return 'stale';
  }
  return 'ok';
}

export function formatLastSync(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', year: 'numeric' });
}

/** Start the Google/Microsoft OAuth flow (redirects the browser). Returns an error message on failure. */
export async function startOAuthConnect(provider: 'google' | 'microsoft'): Promise<string | null> {
  try {
    const res = await fetch('/api/calendar/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || 'Failed to start connection';
  } catch {
    return 'Failed to start connection';
  }
}

/** Friendly text for ?error= codes set by the OAuth callbacks. */
export function oauthErrorMessage(code: string): string {
  switch (code) {
    case 'config_error':
      return "We couldn't connect your calendar because of a problem on our side. Our team has been notified — please try again later.";
    case 'session_mismatch':
      return 'Your session changed while connecting. Please log in again and retry.';
    case 'microsoft_access_denied':
    case 'google_access_denied':
      return 'Connection cancelled — permission was not granted.';
    case 'no_calendars':
      return 'No calendars were found on that account.';
    case 'microsoft_auth_failed':
      return 'Could not connect Outlook. Please try again.';
    case 'google_auth_failed':
      return 'Could not connect Google Calendar. Please try again.';
    default:
      return `Connection failed: ${code.replace(/_/g, ' ')}`;
  }
}
