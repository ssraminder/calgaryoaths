/**
 * Calendar provider integrations: Google Calendar, Microsoft Outlook, Apple (CalDAV).
 *
 * Uses direct REST calls for Google and Microsoft (no heavy SDK dependencies).
 * Uses tsdav for Apple CalDAV.
 */

import { createDAVClient } from 'tsdav';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CalendarProvider = 'google' | 'microsoft' | 'apple';

export type BusyPeriod = {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  eventId?: string;
};

export type CalendarEvent = {
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
};

export type TokenSet = {
  access_token: string;
  refresh_token: string;
  token_expires_at: string; // ISO datetime
};

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * A provider rejected our credentials in a way retrying won't fix.
 *  - needs_reconnect: the user's grant is gone (revoked, expired refresh token,
 *    consent withdrawn). The commissioner must reconnect.
 *  - config_error: our OAuth app is broken (expired/invalid client secret, bad
 *    client id). An admin must fix env vars; reconnecting will not help.
 */
export type CalendarAuthFailure = 'needs_reconnect' | 'config_error';

export class CalendarAuthError extends Error {
  constructor(public readonly kind: CalendarAuthFailure, message: string) {
    super(message);
    this.name = 'CalendarAuthError';
  }
}

/** Non-auth HTTP failure from a provider API (kept separate so callers can tell 404s apart). */
export class CalendarApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CalendarApiError';
  }
}

// AADSTS codes that mean the *app* credentials are wrong, not the user's grant.
// 7000222 = client secret expired, 7000215 = invalid secret, 7000218 = secret missing,
// 700016 = app not found in tenant.
const MS_CONFIG_ERROR_CODES = ['AADSTS7000222', 'AADSTS7000215', 'AADSTS7000218', 'AADSTS700016'];

/** Map an OAuth token-endpoint error response to a permanent failure kind, or null if transient. */
export function classifyOAuthError(error: string | undefined, description?: string): CalendarAuthFailure | null {
  const desc = description || '';
  if (MS_CONFIG_ERROR_CODES.some((code) => desc.includes(code))) return 'config_error';
  if (error === 'invalid_client' || error === 'unauthorized_client') return 'config_error';
  if (error === 'invalid_grant' || error === 'interaction_required' || error === 'consent_required') {
    return 'needs_reconnect';
  }
  return null;
}

/** First line of a provider error, safe to store/show (no tokens, no stack). */
function summarizeOAuthError(provider: string, error: string | undefined, description?: string): string {
  const firstSentence = (description || '').split(/\r?\n|Trace ID:/)[0].trim();
  return `${provider} token error (${error || 'unknown'}): ${firstSentence || 'no description'}`.slice(0, 500);
}

const FETCH_TIMEOUT_MS = 10_000;

// ─── Environment helpers ─────────────────────────────────────────────────────

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

// ─── Google Calendar (direct REST) ───────────────────────────────────────────

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GCAL_API = 'https://www.googleapis.com/calendar/v3';

export function googleAuthUrl(commissionerId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${siteUrl()}/api/calendar/callback/google`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state: commissionerId,
  });
  return `${GOOGLE_AUTH_BASE}?${params}`;
}

export async function googleExchangeCode(code: string): Promise<TokenSet> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: `${siteUrl()}/api/calendar/callback/google`,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (data.error) {
    const msg = summarizeOAuthError('Google', data.error, data.error_description);
    const kind = classifyOAuthError(data.error, data.error_description);
    if (kind) throw new CalendarAuthError(kind, msg);
    throw new Error(msg);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function googleRefreshToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await res.json();
  if (data.error) {
    const msg = summarizeOAuthError('Google', data.error, data.error_description);
    const kind = classifyOAuthError(data.error, data.error_description);
    if (kind) throw new CalendarAuthError(kind, msg);
    throw new Error(msg);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

async function googleFetch(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${GCAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 500);
    if (res.status === 401) throw new CalendarAuthError('needs_reconnect', `Google Calendar rejected the access token (401): ${err}`);
    throw new CalendarApiError(res.status, `Google Calendar API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function googleGetBusyTimes(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const data = await googleFetch(accessToken, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: 'America/Edmonton',
      items: [{ id: calendarId }],
    }),
  });
  const busy = data?.calendars?.[calendarId]?.busy || [];
  return busy.map((b: { start: string; end: string }) => ({ start: b.start, end: b.end }));
}

export async function googleCreateEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<string> {
  const data = await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime, timeZone: 'America/Edmonton' },
      end: { dateTime: event.endTime, timeZone: 'America/Edmonton' },
    }),
  });
  return data.id;
}

export async function googleUpdateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEvent
): Promise<void> {
  await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime, timeZone: 'America/Edmonton' },
      end: { dateTime: event.endTime, timeZone: 'America/Edmonton' },
    }),
  });
}

export async function googleDeleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // Already gone (deleted by hand) — that's the outcome we wanted.
    if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

/** Events (not free/transparent ones) overlapping [timeMin, timeMax], with their exact start. */
export async function googleListEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', maxResults: '250' });
  const data = await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return (data?.items || [])
    .filter((e: { status?: string; start?: { dateTime?: string } }) => e.status !== 'cancelled' && e.start?.dateTime)
    .map((e: { id: string; start: { dateTime: string }; end: { dateTime: string } }) => ({
      start: new Date(e.start.dateTime).toISOString(),
      end: new Date(e.end.dateTime).toISOString(),
      eventId: e.id,
    }));
}

export async function googleListCalendars(
  accessToken: string
): Promise<{ id: string; name: string; primary: boolean }[]> {
  const data = await googleFetch(accessToken, '/users/me/calendarList');
  return (data?.items || []).map((c: { id: string; summary?: string; primary?: boolean }) => ({
    id: c.id,
    name: c.summary || c.id,
    primary: c.primary === true,
  }));
}

// ─── Microsoft / Outlook (direct REST) ───────────────────────────────────────

const MS_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MS_GRAPH = 'https://graph.microsoft.com/v1.0';

export function microsoftAuthUrl(commissionerId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${siteUrl()}/api/calendar/callback/microsoft`,
    // offline_access → refresh token; Calendars.ReadWrite → read busy times + write booking events
    scope: 'Calendars.ReadWrite offline_access',
    response_mode: 'query',
    // Let the user pick the right account when reconnecting
    prompt: 'select_account',
    state: commissionerId,
  });
  return `${MS_AUTH_BASE}/authorize?${params}`;
}

async function microsoftTokenRequest(params: Record<string, string>): Promise<TokenSet & { refresh_token: string | null }> {
  const res = await fetch(`${MS_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      ...params,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await res.json();
  if (data.error || !data.access_token) {
    const msg = summarizeOAuthError('Microsoft', data.error, data.error_description);
    const kind = classifyOAuthError(data.error, data.error_description);
    if (kind) throw new CalendarAuthError(kind, msg);
    throw new Error(msg);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    token_expires_at: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(),
  };
}

export async function microsoftExchangeCode(code: string): Promise<TokenSet> {
  const tokens = await microsoftTokenRequest({
    code,
    redirect_uri: `${siteUrl()}/api/calendar/callback/microsoft`,
    grant_type: 'authorization_code',
  });
  if (!tokens.refresh_token) {
    throw new Error('Microsoft did not return a refresh token (offline_access scope missing?)');
  }
  return { ...tokens, refresh_token: tokens.refresh_token };
}

/**
 * Refresh a Microsoft access token. Microsoft rotates refresh tokens: the response
 * usually carries a new one which MUST be persisted, otherwise the old one eventually
 * stops working. Falls back to the old token if none is returned.
 */
export async function microsoftRefreshToken(refreshToken: string): Promise<TokenSet> {
  const tokens = await microsoftTokenRequest({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'Calendars.ReadWrite offline_access',
  });
  return { ...tokens, refresh_token: tokens.refresh_token || refreshToken };
}

async function msGraphFetch(accessToken: string, path: string, options?: RequestInit) {
  const url = path.startsWith('https://') ? path : `${MS_GRAPH}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 500);
    if (res.status === 401) throw new CalendarAuthError('needs_reconnect', `Microsoft Graph rejected the access token (401): ${err}`);
    throw new CalendarApiError(res.status, `Microsoft Graph API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Graph returns UTC times without a zone suffix when asked for outlook.timezone="UTC". */
function graphUtc(dateTime: string): string {
  return /[zZ]|[+-]\d\d:\d\d$/.test(dateTime) ? new Date(dateTime).toISOString() : new Date(`${dateTime}Z`).toISOString();
}

/** UTC ISO → Graph dateTimeTimeZone (dateTime must not carry an offset). */
function graphDateTime(iso: string) {
  return { dateTime: new Date(iso).toISOString().replace('Z', ''), timeZone: 'UTC' };
}

function msCalendarPath(calendarId: string | null | undefined): string {
  return calendarId ? `/me/calendars/${encodeURIComponent(calendarId)}` : '/me/calendar';
}

type GraphEvent = {
  id: string;
  subject?: string;
  showAs?: string;
  isCancelled?: boolean;
  isAllDay?: boolean;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
};

/** showAs values that make the commissioner unavailable. "free" and "workingElsewhere" don't block. */
const MS_BLOCKING_SHOW_AS = new Set(['busy', 'oof', 'tentative', 'unknown']);

/** Expand the calendar (recurring events included) between timeMin and timeMax. */
async function microsoftCalendarView(
  accessToken: string,
  calendarId: string | null,
  timeMin: string,
  timeMax: string
): Promise<GraphEvent[]> {
  const params = new URLSearchParams({
    startDateTime: new Date(timeMin).toISOString(),
    endDateTime: new Date(timeMax).toISOString(),
    $select: 'id,subject,showAs,isCancelled,isAllDay,start,end',
    $top: '250',
  });
  const events: GraphEvent[] = [];
  let next: string | null = `${msCalendarPath(calendarId)}/calendarView?${params}`;
  for (let page = 0; next && page < 20; page++) {
    const data: { value?: GraphEvent[]; '@odata.nextLink'?: string } = await msGraphFetch(accessToken, next, {
      headers: { Prefer: 'outlook.timezone="UTC"' },
    });
    events.push(...(data?.value || []));
    next = data?.['@odata.nextLink'] || null;
  }
  return events;
}

/** Busy periods (UTC ISO) from Outlook. Events marked Free / Working elsewhere are ignored. */
export async function microsoftGetBusyTimes(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId: string | null = null
): Promise<BusyPeriod[]> {
  const events = await microsoftCalendarView(accessToken, calendarId, timeMin, timeMax);
  return events
    .filter((e) => !e.isCancelled && MS_BLOCKING_SHOW_AS.has((e.showAs || 'busy').toLowerCase()))
    .map((e) => ({
      start: e.isAllDay ? calgaryMidnightUtc(e.start.dateTime) : graphUtc(e.start.dateTime),
      end: e.isAllDay ? calgaryMidnightUtc(e.end.dateTime) : graphUtc(e.end.dateTime),
      eventId: e.id,
    }));
}

/** All non-cancelled events overlapping the window, with exact starts (used to find hand-made duplicates). */
export async function microsoftListEvents(
  accessToken: string,
  calendarId: string | null,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const events = await microsoftCalendarView(accessToken, calendarId, timeMin, timeMax);
  return events
    .filter((e) => !e.isCancelled && !e.isAllDay)
    .map((e) => ({ start: graphUtc(e.start.dateTime), end: graphUtc(e.end.dateTime), eventId: e.id }));
}

/** All-day events are floating dates; treat them as Calgary midnight-to-midnight. */
function calgaryMidnightUtc(dateTime: string): string {
  const [y, m, d] = dateTime.slice(0, 10).split('-').map(Number);
  // Try both Calgary offsets (-6 MDT, -7 MST) and keep the one that lands on local midnight
  for (const offset of [6, 7]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, offset, 0, 0));
    const localHour = Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', hourCycle: 'h23' }).format(candidate)
    );
    if (localHour === 0) return candidate.toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, 7, 0, 0)).toISOString();
}

function graphEventBody(event: CalendarEvent) {
  return {
    subject: event.title,
    body: { contentType: 'text', content: event.description },
    location: { displayName: event.location },
    start: graphDateTime(event.startTime),
    end: graphDateTime(event.endTime),
  };
}

export async function microsoftCreateEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string | null = null
): Promise<string> {
  const data = await msGraphFetch(accessToken, `${msCalendarPath(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(graphEventBody(event)),
  });
  return data.id;
}

export async function microsoftUpdateEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<void> {
  await msGraphFetch(accessToken, `/me/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(graphEventBody(event)),
  });
}

export async function microsoftDeleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  try {
    await msGraphFetch(accessToken, `/me/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  } catch (err) {
    // Already gone (deleted by hand) — that's the outcome we wanted.
    if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

export async function microsoftListCalendars(
  accessToken: string
): Promise<{ id: string; name: string; primary: boolean }[]> {
  const data = await msGraphFetch(accessToken, '/me/calendars');
  return (data?.value || []).map((c: { id: string; name: string; isDefaultCalendar: boolean }) => ({
    id: c.id,
    name: c.name,
    primary: c.isDefaultCalendar === true,
  }));
}

// ─── Apple Calendar (CalDAV via tsdav) ───────────────────────────────────────

const ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';

async function appleClient(
  username: string,
  appPassword: string,
  serverUrl?: string
) {
  const client = await createDAVClient({
    serverUrl: serverUrl || ICLOUD_CALDAV_URL,
    credentials: { username, password: appPassword },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
  return client;
}

export async function appleListCalendars(
  username: string,
  appPassword: string,
  serverUrl?: string
): Promise<{ id: string; name: string; primary: boolean }[]> {
  const client = await appleClient(username, appPassword, serverUrl);
  const calendars = await client.fetchCalendars();
  return calendars.map((c, i) => ({
    id: c.url,
    name: (typeof c.displayName === 'string' ? c.displayName : null) || `Calendar ${i + 1}`,
    primary: i === 0,
  }));
}

export async function appleGetBusyTimes(
  username: string,
  appPassword: string,
  calendarUrl: string,
  timeMin: string,
  timeMax: string,
  serverUrl?: string
): Promise<BusyPeriod[]> {
  const client = await appleClient(username, appPassword, serverUrl);
  const calendars = await client.fetchCalendars();
  const calendar = calendars.find((c) => c.url === calendarUrl);
  if (!calendar) return [];

  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: { start: timeMin, end: timeMax },
  });

  const busy: BusyPeriod[] = [];
  for (const obj of objects) {
    const data = obj.data;
    if (!data) continue;
    const dtStart = extractIcsField(data, 'DTSTART');
    const dtEnd = extractIcsField(data, 'DTEND');
    const uid = extractIcsField(data, 'UID');
    if (dtStart && dtEnd) {
      busy.push({
        start: parseIcsDate(dtStart),
        end: parseIcsDate(dtEnd),
        eventId: uid || undefined,
      });
    }
  }
  return busy;
}

export async function appleCreateEvent(
  username: string,
  appPassword: string,
  calendarUrl: string,
  event: CalendarEvent,
  serverUrl?: string
): Promise<string> {
  const client = await appleClient(username, appPassword, serverUrl);
  const calendars = await client.fetchCalendars();
  const calendar = calendars.find((c) => c.url === calendarUrl);
  if (!calendar) throw new Error('Calendar not found');

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@calgaryoaths.com`;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const now = new Date();

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calgary Oaths//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: icsData,
  });

  return uid;
}

export async function appleDeleteEvent(
  username: string,
  appPassword: string,
  calendarUrl: string,
  eventUid: string,
  serverUrl?: string
): Promise<void> {
  const client = await appleClient(username, appPassword, serverUrl);
  const calendars = await client.fetchCalendars();
  const calendar = calendars.find((c) => c.url === calendarUrl);
  if (!calendar) return;

  const objects = await client.fetchCalendarObjects({ calendar });
  const target = objects.find((obj) => {
    if (!obj.data) return false;
    const uid = extractIcsField(obj.data, 'UID');
    return uid === eventUid;
  });

  if (target) {
    await client.deleteCalendarObject({ calendarObject: target });
  }
}

// ─── ICS helpers ─────────────────────────────────────────────────────────────

function extractIcsField(ics: string, field: string): string | null {
  const regex = new RegExp(`${field}[^:]*:(.+)`, 'i');
  const match = ics.match(regex);
  return match ? match[1].trim() : null;
}

function parseIcsDate(value: string): string {
  const clean = value.replace(/[^0-9TZ]/g, '');
  if (clean.length >= 15) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    const h = clean.slice(9, 11);
    const min = clean.slice(11, 13);
    const s = clean.slice(13, 15);
    const isUtc = clean.endsWith('Z');
    return `${y}-${m}-${d}T${h}:${min}:${s}${isUtc ? '.000Z' : ''}`;
  }
  return value;
}

// ─── Unified interface ───────────────────────────────────────────────────────

export type CalendarConnectionStatus = 'active' | 'needs_reconnect' | 'config_error';

export type CalendarConnection = {
  id: string;
  commissioner_id: string;
  provider: CalendarProvider;
  calendar_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  caldav_url: string | null;
  display_name: string | null;
  sync_enabled: boolean;
  push_bookings: boolean;
  pull_busy_times: boolean;
  last_synced_at: string | null;
  // Added in sql/010 — optional so code keeps working against an older row shape
  status?: CalendarConnectionStatus | null;
  last_error?: string | null;
  last_error_at?: string | null;
  last_alerted_at?: string | null;
};

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** True if an OAuth access token is missing or expires within the next 5 minutes. */
export function needsTokenRefresh(conn: CalendarConnection, now = Date.now()): boolean {
  if (conn.provider === 'apple') return false;
  if (!conn.access_token || !conn.token_expires_at) return true;
  return now >= new Date(conn.token_expires_at).getTime() - REFRESH_BUFFER_MS;
}

/**
 * Ensure the access token is fresh, refreshing if needed.
 * Returns the new tokens (caller must persist ALL of them — Microsoft rotates the
 * refresh token) or null if no refresh was needed. Throws CalendarAuthError on a
 * permanent failure.
 */
export async function ensureFreshToken(conn: CalendarConnection): Promise<TokenSet | null> {
  if (conn.provider === 'apple') return null;
  if (!needsTokenRefresh(conn)) return null;
  if (!conn.refresh_token) {
    throw new CalendarAuthError('needs_reconnect', `${conn.provider} connection has no refresh token`);
  }

  if (conn.provider === 'google') {
    return googleRefreshToken(conn.refresh_token);
  }
  return microsoftRefreshToken(conn.refresh_token);
}

/** Get busy times from any provider */
export async function getBusyTimes(
  conn: CalendarConnection,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  if (conn.provider === 'google') {
    return googleGetBusyTimes(conn.access_token!, conn.calendar_id, timeMin, timeMax);
  }
  if (conn.provider === 'microsoft') {
    return microsoftGetBusyTimes(conn.access_token!, timeMin, timeMax, conn.calendar_id);
  }
  return appleGetBusyTimes(
    conn.access_token!,
    conn.refresh_token!,
    conn.calendar_id,
    timeMin,
    timeMax,
    conn.caldav_url || undefined
  );
}

/** Find an existing event starting at exactly `startIso` (to minute precision). Returns its ID or null. */
export async function findEventStartingAt(
  conn: CalendarConnection,
  startIso: string
): Promise<string | null> {
  const start = new Date(startIso).getTime();
  const timeMin = new Date(start - 60 * 1000).toISOString();
  const timeMax = new Date(start + 60 * 1000).toISOString();
  let events: BusyPeriod[];
  if (conn.provider === 'google') {
    events = await googleListEvents(conn.access_token!, conn.calendar_id, timeMin, timeMax);
  } else if (conn.provider === 'microsoft') {
    events = await microsoftListEvents(conn.access_token!, conn.calendar_id, timeMin, timeMax);
  } else {
    events = await appleGetBusyTimes(
      conn.access_token!, conn.refresh_token!, conn.calendar_id, timeMin, timeMax, conn.caldav_url || undefined
    );
  }
  const minute = (iso: string) => Math.floor(new Date(iso).getTime() / 60000);
  const match = events.find((e) => minute(e.start) === minute(startIso));
  return match?.eventId ?? null;
}

/** Create an event on any provider. Returns the external event ID. */
export async function createCalendarEvent(
  conn: CalendarConnection,
  event: CalendarEvent
): Promise<string> {
  if (conn.provider === 'google') {
    return googleCreateEvent(conn.access_token!, conn.calendar_id, event);
  }
  if (conn.provider === 'microsoft') {
    return microsoftCreateEvent(conn.access_token!, event, conn.calendar_id);
  }
  return appleCreateEvent(
    conn.access_token!,
    conn.refresh_token!,
    conn.calendar_id,
    event,
    conn.caldav_url || undefined
  );
}

/**
 * Update an event in place. Returns the (possibly new) event ID: CalDAV has no
 * PATCH, so Apple events are replaced and get a new UID. If the event was deleted
 * by hand, it is recreated.
 */
export async function updateCalendarEvent(
  conn: CalendarConnection,
  eventId: string,
  event: CalendarEvent
): Promise<string> {
  try {
    if (conn.provider === 'google') {
      await googleUpdateEvent(conn.access_token!, conn.calendar_id, eventId, event);
      return eventId;
    }
    if (conn.provider === 'microsoft') {
      await microsoftUpdateEvent(conn.access_token!, eventId, event);
      return eventId;
    }
  } catch (err) {
    if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) {
      return createCalendarEvent(conn, event);
    }
    throw err;
  }
  await deleteCalendarEvent(conn, eventId);
  return createCalendarEvent(conn, event);
}

/** Delete an event on any provider. Missing events are treated as already deleted. */
export async function deleteCalendarEvent(
  conn: CalendarConnection,
  eventId: string
): Promise<void> {
  if (conn.provider === 'google') {
    return googleDeleteEvent(conn.access_token!, conn.calendar_id, eventId);
  }
  if (conn.provider === 'microsoft') {
    return microsoftDeleteEvent(conn.access_token!, eventId);
  }
  return appleDeleteEvent(
    conn.access_token!,
    conn.refresh_token!,
    conn.calendar_id,
    eventId,
    conn.caldav_url || undefined
  );
}
