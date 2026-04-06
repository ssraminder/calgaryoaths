/**
 * Calendar provider integrations: Google Calendar, Microsoft Outlook, Apple (CalDAV).
 *
 * Provides a unified interface for:
 *  - OAuth URL generation (Google, Microsoft)
 *  - Token exchange and refresh
 *  - Fetching busy/free times (pull)
 *  - Creating/deleting calendar events (push)
 *  - Apple CalDAV via tsdav
 */

import { google, calendar_v3 } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
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

// ─── Environment helpers ─────────────────────────────────────────────────────

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

// ─── Google Calendar ─────────────────────────────────────────────────────────

function googleOAuth2() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${siteUrl()}/api/calendar/callback/google`
  );
}

export function googleAuthUrl(commissionerId: string): string {
  const oauth2 = googleOAuth2();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: commissionerId,
  });
}

export async function googleExchangeCode(code: string): Promise<TokenSet> {
  const oauth2 = googleOAuth2();
  const { tokens } = await oauth2.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    token_expires_at: new Date(tokens.expiry_date!).toISOString(),
  };
}

export async function googleRefreshToken(refreshToken: string): Promise<TokenSet> {
  const oauth2 = googleOAuth2();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();
  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token || refreshToken,
    token_expires_at: new Date(credentials.expiry_date!).toISOString(),
  };
}

function googleCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2 = googleOAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2 });
}

export async function googleGetBusyTimes(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const cal = googleCalendarClient(accessToken);
  const res = await cal.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: 'America/Edmonton',
      items: [{ id: calendarId }],
    },
  });
  const busy = res.data.calendars?.[calendarId]?.busy || [];
  return busy.map((b) => ({ start: b.start!, end: b.end! }));
}

export async function googleCreateEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<string> {
  const cal = googleCalendarClient(accessToken);
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime, timeZone: 'America/Edmonton' },
      end: { dateTime: event.endTime, timeZone: 'America/Edmonton' },
    },
  });
  return res.data.id!;
}

export async function googleDeleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const cal = googleCalendarClient(accessToken);
  await cal.events.delete({ calendarId, eventId });
}

export async function googleListCalendars(
  accessToken: string
): Promise<{ id: string; name: string; primary: boolean }[]> {
  const cal = googleCalendarClient(accessToken);
  const res = await cal.calendarList.list();
  return (res.data.items || []).map((c) => ({
    id: c.id!,
    name: c.summary || c.id!,
    primary: c.primary === true,
  }));
}

// ─── Microsoft / Outlook ─────────────────────────────────────────────────────

const MS_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';

export function microsoftAuthUrl(commissionerId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${siteUrl()}/api/calendar/callback/microsoft`,
    scope: 'Calendars.ReadWrite offline_access',
    response_mode: 'query',
    state: commissionerId,
  });
  return `${MS_AUTH_BASE}/authorize?${params}`;
}

export async function microsoftExchangeCode(code: string): Promise<TokenSet> {
  const res = await fetch(`${MS_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${siteUrl()}/api/calendar/callback/microsoft`,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Microsoft token error: ${data.error_description}`);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function microsoftRefreshToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(`${MS_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Microsoft refresh error: ${data.error_description}`);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

function msGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function microsoftGetBusyTimes(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const client = msGraphClient(accessToken);
  const res = await client.api('/me/calendar/getSchedule').post({
    schedules: ['me'],
    startTime: { dateTime: timeMin, timeZone: 'America/Edmonton' },
    endTime: { dateTime: timeMax, timeZone: 'America/Edmonton' },
    availabilityViewInterval: 30,
  });
  const items = res.value?.[0]?.scheduleItems || [];
  return items
    .filter((item: { status: string }) => item.status !== 'free')
    .map((item: { start: { dateTime: string }; end: { dateTime: string } }) => ({
      start: item.start.dateTime,
      end: item.end.dateTime,
    }));
}

export async function microsoftCreateEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<string> {
  const client = msGraphClient(accessToken);
  const res = await client.api('/me/events').post({
    subject: event.title,
    body: { contentType: 'text', content: event.description },
    location: { displayName: event.location },
    start: { dateTime: event.startTime, timeZone: 'America/Edmonton' },
    end: { dateTime: event.endTime, timeZone: 'America/Edmonton' },
  });
  return res.id;
}

export async function microsoftDeleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const client = msGraphClient(accessToken);
  await client.api(`/me/events/${eventId}`).delete();
}

export async function microsoftListCalendars(
  accessToken: string
): Promise<{ id: string; name: string; primary: boolean }[]> {
  const client = msGraphClient(accessToken);
  const res = await client.api('/me/calendars').get();
  return (res.value || []).map((c: { id: string; name: string; isDefaultCalendar: boolean }) => ({
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
  // Handle format: 20260406T143000Z or 20260406T143000
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
};

/** Ensure the access token is fresh, refreshing if needed. Returns updated tokens or null if no refresh needed. */
export async function ensureFreshToken(conn: CalendarConnection): Promise<TokenSet | null> {
  if (conn.provider === 'apple') return null; // CalDAV uses basic auth

  if (!conn.token_expires_at || !conn.refresh_token) return null;
  const expiresAt = new Date(conn.token_expires_at).getTime();
  const buffer = 5 * 60 * 1000; // refresh 5 min before expiry
  if (Date.now() < expiresAt - buffer) return null;

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
    return microsoftGetBusyTimes(conn.access_token!, timeMin, timeMax);
  }
  // Apple CalDAV — access_token holds username, refresh_token holds app password
  return appleGetBusyTimes(
    conn.access_token!,
    conn.refresh_token!,
    conn.calendar_id,
    timeMin,
    timeMax,
    conn.caldav_url || undefined
  );
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
    return microsoftCreateEvent(conn.access_token!, event);
  }
  return appleCreateEvent(
    conn.access_token!,
    conn.refresh_token!,
    conn.calendar_id,
    event,
    conn.caldav_url || undefined
  );
}

/** Delete an event on any provider */
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
