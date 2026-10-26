/**
 * Calendar connection lifecycle: keeping tokens fresh, persisting rotated tokens,
 * and recording/alerting on failures so a dead connection is never silent.
 */
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { sendPushToCommissioner } from '@/lib/push';
import {
  CalendarAuthError,
  CalendarConnection,
  CalendarConnectionStatus,
  ensureFreshToken,
} from '@/lib/calendar-providers';

const ADMIN_EMAIL = 'info@calgaryoaths.com';
/** Don't re-alert about the same broken connection more often than this. */
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google Calendar',
  microsoft: 'Outlook',
  apple: 'Apple Calendar',
};

/**
 * Refresh the access token if needed and persist access token, rotated refresh
 * token and expiry together. Throws on failure — callers pass the error to
 * recordConnectionError so permanent auth failures flag the connection.
 */
export async function withFreshToken(conn: CalendarConnection): Promise<CalendarConnection> {
  const tokens = await ensureFreshToken(conn);
  if (!tokens) return conn;

  const { error } = await supabaseAdmin
    .from('co_calendar_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.token_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id);
  if (error) {
    // The new tokens still work for this request, but losing a rotated refresh token is serious
    console.error(`[calendar] failed to persist refreshed tokens for connection ${conn.id}:`, error.message);
  }

  conn.access_token = tokens.access_token;
  conn.refresh_token = tokens.refresh_token;
  conn.token_expires_at = tokens.token_expires_at;
  return conn;
}

/** Mark a connection healthy again after a successful provider call. */
export async function markConnectionHealthy(conn: CalendarConnection): Promise<void> {
  if ((conn.status ?? 'active') === 'active' && !conn.last_error) return;
  await supabaseAdmin
    .from('co_calendar_connections')
    .update({ status: 'active', last_error: null, last_error_at: null, updated_at: new Date().toISOString() })
    .eq('id', conn.id);
  conn.status = 'active';
  conn.last_error = null;
}

/**
 * Record a failed provider call. Permanent auth failures change the connection's
 * status and alert the commissioner (and admin for platform config errors);
 * transient errors are only logged on the row.
 */
export async function recordConnectionError(
  conn: CalendarConnection,
  err: unknown,
  context: string
): Promise<void> {
  const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
  const nowIso = new Date().toISOString();
  console.error(
    `[calendar] ${context} failed — connection=${conn.id} commissioner=${conn.commissioner_id} provider=${conn.provider}: ${message}`
  );

  const update: Record<string, unknown> = { last_error: `${context}: ${message}`, last_error_at: nowIso };
  let newStatus: CalendarConnectionStatus | null = null;
  if (err instanceof CalendarAuthError) {
    newStatus = err.kind;
    update.status = newStatus;
  }

  const previousStatus = conn.status ?? 'active';
  const lastAlerted = conn.last_alerted_at ? new Date(conn.last_alerted_at).getTime() : 0;
  const shouldAlert =
    newStatus !== null && (newStatus !== previousStatus || Date.now() - lastAlerted > ALERT_COOLDOWN_MS);
  if (shouldAlert) update.last_alerted_at = nowIso;

  const { error } = await supabaseAdmin.from('co_calendar_connections').update(update).eq('id', conn.id);
  if (error) console.error(`[calendar] failed to record error on connection ${conn.id}:`, error.message);

  conn.last_error = update.last_error as string;
  conn.last_error_at = nowIso;
  if (newStatus) conn.status = newStatus;

  if (shouldAlert && newStatus) {
    conn.last_alerted_at = nowIso;
    await alertConnectionProblem(conn, newStatus, message);
  }
}

async function alertConnectionProblem(
  conn: CalendarConnection,
  kind: CalendarConnectionStatus,
  message: string
): Promise<void> {
  const providerName = PROVIDER_NAMES[conn.provider] || conn.provider;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calgaryoaths.com';
  const calendarUrl = `${siteUrl}/vendor/calendar`;

  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('name, email')
    .eq('id', conn.commissioner_id)
    .single();

  const isConfig = kind === 'config_error';
  const vendorBody = isConfig
    ? `<p>Calgary Oaths can't reach your ${providerName} calendar right now because of a problem on our side. Our team has been notified and is fixing it — you don't need to do anything.</p>
       <p>Until it's fixed, new bookings won't appear in ${providerName} and your ${providerName} busy times won't block booking slots. Please keep an eye on your bookings in the <a href="${siteUrl}/vendor/bookings">Partner Portal</a>.</p>`
    : `<p>Your ${providerName} connection has stopped working, so new bookings aren't being added to your calendar and your busy times aren't blocking booking slots.</p>
       <p><a href="${calendarUrl}" style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;">Reconnect ${providerName}</a></p>`;

  if (commissioner?.email) {
    try {
      await sendEmail({
        to: commissioner.email,
        subject: isConfig ? `${providerName} sync paused` : `Action needed: reconnect ${providerName}`,
        html: `<p>Hi ${commissioner.name || ''},</p>${vendorBody}<p>Thank you,<br/>Calgary Oaths</p>`,
      });
    } catch (e) { console.error('[calendar] alert email to commissioner failed:', e); }
  }

  try {
    await sendPushToCommissioner(conn.commissioner_id, {
      title: isConfig ? `${providerName} sync paused` : `Reconnect ${providerName}`,
      body: isConfig
        ? 'Calendar sync is paused. Our team is fixing it.'
        : 'Your calendar connection stopped working. Tap to reconnect.',
      url: '/vendor/calendar',
      tag: `calendar-${conn.id}`,
    });
  } catch (e) { console.error('[calendar] alert push failed:', e); }

  // Admin always hears about it; for config errors they're the only ones who can fix it
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Admin] ${providerName} calendar ${isConfig ? 'CONFIG ERROR' : 'needs reconnect'} — ${commissioner?.name || conn.commissioner_id}`,
      html: `<p>Calendar connection <code>${conn.id}</code> for ${commissioner?.name || conn.commissioner_id} is now <strong>${kind}</strong>.</p>
             <p><strong>Error:</strong> ${escapeHtml(message)}</p>
             ${isConfig ? `<p>This is a platform configuration problem (e.g. an expired OAuth client secret). Rotate the secret in the provider console, update the Netlify environment variable, and redeploy. The commissioner does not need to reconnect.</p>` : '<p>The commissioner has been asked to reconnect.</p>'}`,
    });
  } catch (e) { console.error('[calendar] alert email to admin failed:', e); }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** True if we shouldn't bother calling the provider until someone fixes the connection. */
export function isConnectionBroken(conn: CalendarConnection): boolean {
  return conn.status === 'needs_reconnect' || conn.status === 'config_error';
}
