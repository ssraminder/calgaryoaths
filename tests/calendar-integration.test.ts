/**
 * End-to-end behaviour of the Outlook integration against an in-memory database
 * and a fake Microsoft Graph: slots, scheduled sync, push on confirm/reschedule/
 * cancel, backfill, toggles, and failure handling.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { FakeSupabase } from './helpers/fake-supabase';
import { FakeGraph } from './helpers/fake-graph';

const h = vi.hoisted(() => ({
  db: null as unknown as import('./helpers/fake-supabase').FakeSupabase,
  emails: [] as { to: string | string[]; subject: string; html: string }[],
  pushes: [] as { commissionerId: string; title: string }[],
  vendor: null as null | { id: string; commissionerId: string; commissionerName: string },
}));

vi.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: (t: string) => h.db.from(t) } }));
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: { to: string | string[]; subject: string; html: string }) => { h.emails.push(opts); },
}));
vi.mock('@/lib/push', () => ({
  sendPushToCommissioner: async (commissionerId: string, p: { title: string }) => { h.pushes.push({ commissionerId, title: p.title }); },
}));
vi.mock('@/lib/vendor-auth', () => ({ verifyVendor: async () => h.vendor }));

import { GET as slotsGET } from '@/app/api/booking/slots/route';
import { POST as syncPOST } from '@/app/api/calendar/sync/route';
import { POST as backfillPOST } from '@/app/api/calendar/backfill/route';
import { GET as connectionsGET, PATCH as connectionsPATCH } from '@/app/api/calendar/connections/route';
import { GET as msCallbackGET } from '@/app/api/calendar/callback/microsoft/route';
import { POST as vendorSetTimePOST } from '@/app/api/vendor/bookings/[id]/set-time/route';
import { syncBookingCalendarEvents, runCalendarSync } from '@/lib/calendar-sync';

const NOW = new Date('2026-10-26T12:00:00Z'); // Mon 06:00 MDT
const CONN_ID = '5c3be146-8a01-4cc4-adb1-22ebdfd90b1c';
const RICK_ID = '01926d0f-1657-411e-911f-b311ed58f635';

let graph: FakeGraph;

function seed() {
  const db = new FakeSupabase();
  db.tables = {
    co_commissioners: [{ id: 'raminder-shah', name: 'Raminder Shah', email: 'commissioner@example.com', min_booking_buffer_hours: 2, address: 'HQ', user_id: 'u1' }],
    co_settings: [],
    co_locations: [
      { id: 'downtown-calgary', name: 'Downtown Calgary', address: '421 7th Ave SW, #3000, Calgary, AB T2P 4K9' },
      { id: 'northeast-calgary', name: 'NE Calgary — Redstone', address: '220 Red Sky Terrace NE, Calgary, AB T3N 1M9' },
    ],
    co_availability_rules: [
      ...[1, 2, 3, 4, 5].map((d) => ({ commissioner_id: 'raminder-shah', location_id: 'downtown-calgary', day_of_week: d, start_time: '11:00:00', end_time: '17:00:00', active: true })),
      { commissioner_id: 'raminder-shah', location_id: 'northeast-calgary', day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00', active: true },
    ],
    co_blocked_dates: [],
    co_custom_times: [],
    // Mirrors production: token expired Oct 1, never synced since April
    co_calendar_connections: [{
      id: CONN_ID, commissioner_id: 'raminder-shah', provider: 'microsoft', calendar_id: 'cal-default', display_name: 'Calendar',
      access_token: 'stale-access', refresh_token: 'refresh-0', token_expires_at: '2026-10-01T16:15:23.375Z', caldav_url: null,
      sync_enabled: true, push_bookings: true, pull_busy_times: true, last_synced_at: '2026-04-08T00:13:03.062Z',
      created_at: '2026-04-08T00:12:55Z', updated_at: '2026-04-08T00:12:55Z',
      status: 'active', last_error: null, last_error_at: null, last_alerted_at: null,
    }],
    co_bookings: [{
      id: RICK_ID, commissioner_id: 'raminder-shah', status: 'confirmed', appointment_datetime: '2026-10-26T19:30:00.000Z',
      service_name: 'Affidavit Commissioning', name: 'Rick Bekkerus', email: 'rick@example.com', phone: '403-555-0100',
      notes: null, delivery_mode: 'in_office', customer_address: null, location_id: 'downtown-calgary',
      updated_at: '2026-10-23T21:06:42Z', calendar_events: {},
    }],
  };
  return db;
}

const conn = () => h.db.tables.co_calendar_connections[0];
const booking = (id = RICK_ID) => h.db.tables.co_bookings.find((b) => b.id === id)!;
const localTimes = (slots: string[], day: string) =>
  slots
    .filter((s) => new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' }) === day)
    .map((s) => new Date(s).toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));

async function getSlots(locationId = 'downtown-calgary', startDate = '2026-10-26') {
  const res = await slotsGET(new NextRequest(`http://localhost/api/booking/slots?commissionerId=raminder-shah&startDate=${startDate}&locationId=${locationId}`));
  expect(res.status).toBe(200);
  return ((await res.json()) as { slots: string[] }).slots;
}

const cron = (path: string) =>
  new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { authorization: 'Bearer test-cron' } });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  h.db = seed();
  h.emails = [];
  h.pushes = [];
  h.vendor = { id: 'u1', commissionerId: 'raminder-shah', commissionerName: 'Raminder Shah' };
  graph = new FakeGraph();
  vi.stubGlobal('fetch', graph.fetch);
  process.env.MICROSOFT_CLIENT_ID = 'test-client';
  process.env.MICROSOFT_CLIENT_SECRET = 'test-secret';
  process.env.CRON_SECRET = 'test-cron';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://calgaryoaths.com';
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('slots API with Outlook busy times (checklist 3, 4)', () => {
  beforeEach(() => {
    graph.events = [
      { id: 'busy-am', subject: 'Busy', start: '2026-10-26T12:15:00Z', end: '2026-10-26T18:00:00Z', showAs: 'busy' }, // 06:15–12:00
      { id: 'free-pm', subject: 'FYI', start: '2026-10-26T20:00:00Z', end: '2026-10-26T21:00:00Z', showAs: 'free' },  // 14:00–15:00
    ];
  });

  it('REGRESSION Downtown: Busy 06:15–12:00 removes 11:00/11:30; Free event removes nothing', async () => {
    const day = localTimes(await getSlots(), '2026-10-26');
    expect(day).not.toContain('11:00');
    expect(day).not.toContain('11:30');
    expect(day).not.toContain('13:30'); // Rick's booking
    expect(day).toEqual(expect.arrayContaining(['12:00', '14:00', '14:30']));
  });

  it('NE location gets the same busy-time filtering', async () => {
    vi.setSystemTime(new Date('2026-10-26T08:00:00Z'));
    expect(localTimes(await getSlots('northeast-calgary'), '2026-10-26')).toEqual([]);
    graph.events = [];
    expect(localTimes(await getSlots('northeast-calgary'), '2026-10-26')).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('refreshes the expired access token and persists the rotated refresh token', async () => {
    await getSlots();
    expect(conn().access_token).toBe('access-1');
    expect(conn().refresh_token).toBe('rotated-refresh-1');
    expect(Date.parse(conn().token_expires_at)).toBe(NOW.getTime() + 3600 * 1000);
    expect(conn().updated_at).toBe(NOW.toISOString());
  });
});

describe('dead token (checklist 8)', () => {
  it('expired client secret: customers still get slots, connection flagged config_error, alerts sent once', async () => {
    graph.tokenBehaviour = 'expired_secret';
    const slots = await getSlots();
    expect(localTimes(slots, '2026-10-26')).toContain('11:00'); // non-blocking: no calendar data, slots still served
    expect(conn().status).toBe('config_error');
    expect(conn().last_error).toContain('AADSTS7000222');
    expect(h.emails.map((e) => e.to)).toEqual(['commissioner@example.com', 'info@calgaryoaths.com']);
    expect(h.emails[1].subject).toContain('CONFIG ERROR');
    expect(h.pushes).toHaveLength(1);

    // Second customer request: no repeat alert and no doomed token call
    const tokenCalls = graph.calls.length;
    await getSlots();
    expect(h.emails).toHaveLength(2);
    expect(graph.calls.length).toBe(tokenCalls);
  });

  it('while broken, previously synced busy blocks still protect the slots', async () => {
    h.db.tables.co_custom_times.push({
      commissioner_id: 'raminder-shah', custom_date: '2026-10-26', start_time: '06:15', end_time: '12:00',
      mode: 'block', source: 'calendar', reason: `calendar:${CONN_ID}`,
    });
    conn().status = 'config_error';
    const day = localTimes(await getSlots(), '2026-10-26');
    expect(day).not.toContain('11:00');
    expect(day).not.toContain('11:30');
  });

  it('invalid_grant: flagged needs_reconnect, commissioner asked to reconnect, status visible in connections API', async () => {
    graph.tokenBehaviour = 'invalid_grant';
    await getSlots();
    expect(conn().status).toBe('needs_reconnect');
    expect(h.emails[0].subject).toBe('Action needed: reconnect Outlook');
    expect(h.emails[0].html).toContain('/vendor/calendar');
    const res = await connectionsGET(new NextRequest('http://localhost/api/calendar/connections'));
    const { connections } = await res.json();
    expect(connections[0]).toMatchObject({ id: CONN_ID, status: 'needs_reconnect' });
    expect(connections[0].access_token).toBeUndefined();
    expect(connections[0].refresh_token).toBeUndefined();
  });

  it('the scheduled sync recovers a config_error connection once the secret is fixed', async () => {
    conn().status = 'config_error';
    conn().last_error = 'token refresh: AADSTS7000222';
    await runCalendarSync();
    expect(conn().status).toBe('active');
    expect(conn().last_error).toBeNull();
  });
});

describe('scheduled sync (checklist 5)', () => {
  it('requires the cron secret', async () => {
    h.vendor = null;
    const res = await syncPOST(new NextRequest('http://localhost/api/calendar/sync', { method: 'POST', headers: { authorization: 'Bearer wrong' } }));
    expect(res.status).toBe(401);
  });

  it('pulls busy times into co_custom_times and stamps last_synced_at', async () => {
    graph.events = [
      { id: 'busy-am', subject: 'Busy', start: '2026-10-26T12:15:00Z', end: '2026-10-26T18:00:00Z' },
      { id: 'free', subject: 'FYI', start: '2026-10-27T18:00:00Z', end: '2026-10-27T19:00:00Z', showAs: 'free' },
    ];
    // A manual block with the same window must survive, and stale synced rows must go
    h.db.tables.co_custom_times.push(
      { id: 'manual', commissioner_id: 'raminder-shah', custom_date: '2026-10-26', start_time: '06:15', end_time: '12:00', mode: 'block', source: 'manual', reason: 'dentist' },
      { id: 'legacy', commissioner_id: 'raminder-shah', custom_date: '2026-10-28', start_time: '09:00', end_time: '10:00', mode: 'block', source: 'calendar', reason: 'microsoft calendar' },
    );
    const res = await syncPOST(cron('/api/calendar/sync'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(0);
    expect(conn().last_synced_at).toBe(NOW.toISOString());
    const rows = h.db.tables.co_custom_times;
    expect(rows.find((r) => r.id === 'manual')).toMatchObject({ source: 'manual', reason: 'dentist' });
    expect(rows.find((r) => r.id === 'legacy')).toBeUndefined();
    expect(rows.filter((r) => r.source === 'calendar')).toEqual([]); // only window collided with the manual block
    // The same run backfilled Rick's booking into Outlook
    expect(body.pushedBookings).toBe(1);
    graph.events.push({ id: 'busy-thu', subject: 'Busy', start: '2026-10-29T17:00:00Z', end: '2026-10-29T18:30:00Z' });
    await syncPOST(cron('/api/calendar/sync'));
    const synced = h.db.tables.co_custom_times.filter((r) => r.source === 'calendar');
    expect(synced).toEqual(expect.arrayContaining([
      expect.objectContaining({ custom_date: '2026-10-29', start_time: '11:00', end_time: '12:30', reason: `calendar:${CONN_ID}` }),
      // …and our own pushed event comes back as busy, which is harmless (the booking blocks it anyway)
      expect.objectContaining({ custom_date: '2026-10-26', start_time: '13:30', end_time: '14:00' }),
    ]));
    expect(synced).toHaveLength(2);
  });
});

describe('push: confirm / reschedule / cancel (checklist 6)', () => {
  beforeEach(() => {
    conn().access_token = 'initial-access';
    conn().token_expires_at = new Date(NOW.getTime() + 3600_000).toISOString();
  });

  it('confirm creates an Outlook event with customer, service, location and contact details', async () => {
    const r = await syncBookingCalendarEvents(RICK_ID);
    expect(r.created).toBe(1);
    expect(graph.events).toHaveLength(1);
    const ev = graph.events[0];
    expect(ev.subject).toBe('Affidavit Commissioning — Rick Bekkerus');
    expect(ev.start).toBe('2026-10-26T19:30:00.000Z');
    expect(ev.end).toBe('2026-10-26T20:00:00.000Z');
    expect(ev.location).toBe('421 7th Ave SW, #3000, Calgary, AB T2P 4K9');
    expect(ev.body).toContain('Customer: Rick Bekkerus');
    expect(ev.body).toContain('Phone: 403-555-0100');
    expect(ev.body).toContain('Email: rick@example.com');
    expect(ev.body).toContain('Downtown Calgary');
    expect(booking().calendar_events[CONN_ID]).toEqual({ provider: 'microsoft', event_id: ev.id, start: '2026-10-26T19:30:00.000Z' });

    // Idempotent
    expect((await syncBookingCalendarEvents(RICK_ID)).unchanged).toBe(1);
    expect(graph.events).toHaveLength(1);
  });

  it('vendor "Set Confirmed Time" moves the existing event', async () => {
    await syncBookingCalendarEvents(RICK_ID);
    const eventId = graph.events[0].id;
    const res = await vendorSetTimePOST(
      new NextRequest(`http://localhost/api/vendor/bookings/${RICK_ID}/set-time`, {
        method: 'POST', body: JSON.stringify({ appointment_datetime: '2026-10-27T17:00:00.000Z' }),
      }),
      { params: Promise.resolve({ id: RICK_ID }) }
    );
    expect(res.status).toBe(200);
    expect(graph.events).toHaveLength(1);
    expect(graph.events[0]).toMatchObject({ id: eventId, start: '2026-10-27T17:00:00.000Z' });
    expect(booking().calendar_events[CONN_ID].start).toBe('2026-10-27T17:00:00.000Z');
  });

  it('cancel deletes the event and clears the stored ID', async () => {
    await syncBookingCalendarEvents(RICK_ID);
    booking().status = 'cancelled';
    const r = await syncBookingCalendarEvents(RICK_ID);
    expect(r.deleted).toBe(1);
    expect(graph.events).toHaveLength(0);
    expect(booking().calendar_events).toEqual({});
  });

  it('completed bookings keep their event', async () => {
    await syncBookingCalendarEvents(RICK_ID);
    booking().status = 'completed';
    await syncBookingCalendarEvents(RICK_ID);
    expect(graph.events).toHaveLength(1);
  });

  it('push toggle off: nothing is created', async () => {
    conn().push_bookings = false;
    expect((await syncBookingCalendarEvents(RICK_ID)).skipped).toBe(1);
    expect(graph.events).toHaveLength(0);
  });
});

describe('backfill', () => {
  beforeEach(() => {
    conn().access_token = 'initial-access';
    conn().token_expires_at = new Date(NOW.getTime() + 3600_000).toISOString();
    h.db.tables.co_bookings.push({
      ...booking(), id: 'b2', name: 'Second Customer', appointment_datetime: '2026-10-28T18:00:00.000Z', calendar_events: {},
    });
    // Rick's event was added by hand in Outlook
    graph.events = [{ id: 'hand-made', subject: 'Rick B - affidavit', start: '2026-10-26T19:30:00Z', end: '2026-10-26T20:00:00Z' }];
  });

  it('dry run changes nothing', async () => {
    const res = await backfillPOST(cron('/api/calendar/backfill?dryRun=true'));
    expect(await res.json()).toMatchObject({ dryRun: true, adopted: 1, created: 1 });
    expect(graph.events).toHaveLength(1);
    expect(booking().calendar_events).toEqual({});
  });

  it('adopts the hand-made event, creates the missing one, and is idempotent', async () => {
    const first = await (await backfillPOST(cron('/api/calendar/backfill'))).json();
    expect(first).toMatchObject({ adopted: 1, created: 1, failed: 0 });
    expect(graph.events).toHaveLength(2);
    expect(booking().calendar_events[CONN_ID]).toMatchObject({ event_id: 'hand-made', adopted: true });

    const second = await (await backfillPOST(cron('/api/calendar/backfill'))).json();
    expect(second).toMatchObject({ bookings: 0, created: 0, adopted: 0 });
    expect(graph.events).toHaveLength(2);
  });

  it('never deletes a hand-made event on cancel', async () => {
    await backfillPOST(cron('/api/calendar/backfill'));
    booking().status = 'cancelled';
    await syncBookingCalendarEvents(RICK_ID);
    expect(graph.events.map((e) => e.id)).toContain('hand-made');
    expect(booking().calendar_events).toEqual({});
  });

  it('a lost event-ID write cannot cause duplicates on the next run', async () => {
    h.db.failOn = (table, op) => (table === 'co_bookings' && op === 'update' ? 'column "calendar_events" does not exist' : null);
    await backfillPOST(cron('/api/calendar/backfill'));
    await backfillPOST(cron('/api/calendar/backfill'));
    expect(graph.events).toHaveLength(2);
  });

  it('skips bookings changed in the last 5 minutes (a confirm may still be pushing)', async () => {
    booking('b2').updated_at = new Date(NOW.getTime() - 60_000).toISOString();
    const r = await (await backfillPOST(cron('/api/calendar/backfill'))).json();
    expect(r.created).toBe(0);
  });
});

describe('toggles on /vendor/calendar (checklist 7)', () => {
  const patch = (body: object) =>
    connectionsPATCH(new NextRequest('http://localhost/api/calendar/connections', { method: 'PATCH', body: JSON.stringify({ connectionId: CONN_ID, ...body }) }));

  beforeEach(() => {
    graph.events = [{ id: 'busy', subject: 'Busy', start: '2026-10-29T17:00:00Z', end: '2026-10-29T18:00:00Z' }];
  });

  it('pull off clears synced blocks; pull on re-syncs immediately', async () => {
    await runCalendarSync({ backfill: false });
    expect(h.db.tables.co_custom_times.filter((r) => r.source === 'calendar')).toHaveLength(1);
    expect((await patch({ pull_busy_times: false })).status).toBe(200);
    expect(conn().pull_busy_times).toBe(false);
    expect(h.db.tables.co_custom_times.filter((r) => r.source === 'calendar')).toHaveLength(0);
    await patch({ pull_busy_times: true });
    expect(h.db.tables.co_custom_times.filter((r) => r.source === 'calendar')).toHaveLength(1);
  });

  it('push on backfills upcoming bookings', async () => {
    conn().push_bookings = false;
    await patch({ push_bookings: true });
    expect(conn().push_bookings).toBe(true);
    expect(graph.events.some((e) => e.subject.includes('Rick Bekkerus'))).toBe(true);
  });

  it('sync off stops everything and clears blocks', async () => {
    await runCalendarSync({ backfill: false });
    await patch({ sync_enabled: false });
    expect(h.db.tables.co_custom_times.filter((r) => r.source === 'calendar')).toHaveLength(0);
    expect((await syncBookingCalendarEvents(RICK_ID)).skipped).toBe(1);
  });

  it('rejects another vendor', async () => {
    h.vendor = { id: 'u2', commissionerId: 'someone-else', commissionerName: 'X' };
    expect((await patch({ push_bookings: false })).status).toBe(404);
  });
});

describe('OAuth callback (checklist 2)', () => {
  const callback = (qs: string) => msCallbackGET(new NextRequest(`http://localhost/api/calendar/callback/microsoft?${qs}`));

  it('stores tokens, resets a broken connection to active, and loads the calendar', async () => {
    conn().status = 'needs_reconnect';
    const res = await callback('code=abc&state=raminder-shah');
    expect(res.headers.get('location')).toBe('https://calgaryoaths.com/vendor/calendar?connected=microsoft');
    expect(h.db.tables.co_calendar_connections).toHaveLength(1);
    expect(conn()).toMatchObject({ status: 'active', access_token: 'access-1', refresh_token: 'rotated-refresh-1', calendar_id: 'cal-default', display_name: 'Calendar' });
    expect(conn().last_synced_at).toBe(NOW.toISOString());
  });

  it('refuses to attach a calendar to a commissioner the logged-in vendor is not', async () => {
    h.vendor = { id: 'attacker', commissionerId: 'someone-else', commissionerName: 'X' };
    const res = await callback('code=abc&state=raminder-shah');
    expect(res.headers.get('location')).toContain('error=session_mismatch');
    expect(graph.calls).toHaveLength(0);
  });

  it('reports a platform config error distinctly', async () => {
    graph.tokenBehaviour = 'expired_secret';
    const res = await callback('code=abc&state=raminder-shah');
    expect(res.headers.get('location')).toContain('error=config_error');
  });

  it('handles the user declining consent', async () => {
    const res = await callback('error=access_denied&error_description=user+cancelled&state=raminder-shah');
    expect(res.headers.get('location')).toContain('error=microsoft_access_denied');
  });
});
