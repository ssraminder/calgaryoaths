import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeGraph } from './helpers/fake-graph';
import {
  CalendarAuthError,
  classifyOAuthError,
  ensureFreshToken,
  microsoftAuthUrl,
  microsoftCreateEvent,
  microsoftGetBusyTimes,
  microsoftRefreshToken,
  needsTokenRefresh,
  type CalendarConnection,
} from '@/lib/calendar-providers';

let graph: FakeGraph;
beforeEach(() => {
  graph = new FakeGraph();
  vi.stubGlobal('fetch', graph.fetch);
  process.env.MICROSOFT_CLIENT_ID = 'test-client';
  process.env.MICROSOFT_CLIENT_SECRET = 'test-secret';
});
afterEach(() => vi.unstubAllGlobals());

function conn(overrides: Partial<CalendarConnection> = {}): CalendarConnection {
  return {
    id: 'conn-1', commissioner_id: 'raminder-shah', provider: 'microsoft', calendar_id: 'cal-default',
    access_token: 'initial-access', refresh_token: 'refresh-0', token_expires_at: '2026-10-01T16:15:23Z',
    caldav_url: null, display_name: 'Calendar', sync_enabled: true, push_bookings: true, pull_busy_times: true,
    last_synced_at: null, status: 'active', ...overrides,
  };
}

describe('Microsoft OAuth', () => {
  it('requests offline_access and Calendars.ReadWrite', () => {
    const scope = new URL(microsoftAuthUrl('raminder-shah')).searchParams.get('scope')!;
    expect(scope.split(' ')).toEqual(expect.arrayContaining(['offline_access', 'Calendars.ReadWrite']));
  });

  it('refreshes an expired access token and returns the ROTATED refresh token', async () => {
    const c = conn();
    expect(needsTokenRefresh(c, Date.parse('2026-10-26T12:00:00Z'))).toBe(true);
    const tokens = await ensureFreshToken(c);
    expect(tokens).not.toBeNull();
    expect(tokens!.access_token).toBe('access-1');
    expect(tokens!.refresh_token).toBe('rotated-refresh-1');
    expect(Date.parse(tokens!.token_expires_at)).toBeGreaterThan(Date.now() + 50 * 60 * 1000);
    const req = graph.calls.find((c) => c.url.includes('/token'))!;
    expect(req.body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'refresh-0', client_secret: 'test-secret' });
  });

  it('does not refresh a token that is still valid', async () => {
    const tokens = await ensureFreshToken(conn({ token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
    expect(tokens).toBeNull();
    expect(graph.calls).toHaveLength(0);
  });

  it('keeps the old refresh token if Microsoft does not rotate it', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ access_token: 'a', expires_in: 3600 }), { status: 200 }));
    expect((await microsoftRefreshToken('keep-me')).refresh_token).toBe('keep-me');
  });

  it('classifies an expired client secret (the production failure) as config_error', async () => {
    graph.tokenBehaviour = 'expired_secret';
    const err = await ensureFreshToken(conn()).catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.kind).toBe('config_error');
    expect(err.message).toContain('AADSTS7000222');
    expect(err.message).not.toContain('Trace ID'); // trimmed for storage
  });

  it('classifies invalid_grant as needs_reconnect', async () => {
    graph.tokenBehaviour = 'invalid_grant';
    const err = await ensureFreshToken(conn()).catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.kind).toBe('needs_reconnect');
  });

  it('treats provider outages as transient (not a reconnect)', async () => {
    graph.tokenBehaviour = 'server_error';
    const err = await ensureFreshToken(conn()).catch((e) => e);
    expect(err).not.toBeInstanceOf(CalendarAuthError);
    expect(classifyOAuthError('temporarily_unavailable')).toBeNull();
  });
});

describe('Microsoft busy times', () => {
  it('returns Busy/OOF/Tentative events and ignores Free, Working elsewhere and cancelled ones', async () => {
    graph.events = [
      { id: 'busy', subject: 'Busy block', start: '2026-10-26T12:15:00Z', end: '2026-10-26T18:00:00Z', showAs: 'busy' },
      { id: 'free', subject: 'FYI', start: '2026-10-26T20:00:00Z', end: '2026-10-26T21:00:00Z', showAs: 'free' },
      { id: 'we', subject: 'WFH', start: '2026-10-26T15:00:00Z', end: '2026-10-26T23:00:00Z', showAs: 'workingElsewhere' },
      { id: 'tent', subject: 'Maybe', start: '2026-10-27T17:00:00Z', end: '2026-10-27T18:00:00Z', showAs: 'tentative' },
      { id: 'cxl', subject: 'Cancelled', start: '2026-10-27T19:00:00Z', end: '2026-10-27T20:00:00Z', isCancelled: true },
    ];
    const busy = await microsoftGetBusyTimes('initial-access', '2026-10-26T06:00:00Z', '2026-11-09T07:00:00Z', 'cal-default');
    expect(busy.map((b) => b.eventId).sort()).toEqual(['busy', 'tent']);
    expect(busy.find((b) => b.eventId === 'busy')).toEqual({
      start: '2026-10-26T12:15:00.000Z', end: '2026-10-26T18:00:00.000Z', eventId: 'busy',
    });
    const req = graph.calls[0];
    expect(req.url).toContain('/me/calendars/cal-default/calendarView');
  });

  it('a 401 from Graph is a needs_reconnect auth error', async () => {
    const err = await microsoftGetBusyTimes('revoked', '2026-10-26T06:00:00Z', '2026-10-27T06:00:00Z').catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.kind).toBe('needs_reconnect');
  });
});

describe('Microsoft events', () => {
  it('creates events at the right instant (UTC dateTime, no offset)', async () => {
    const id = await microsoftCreateEvent('initial-access', {
      title: 'Affidavit Commissioning — Rick Bekkerus', description: 'x', location: '421 7th Ave SW',
      startTime: '2026-10-26T19:30:00.000Z', endTime: '2026-10-26T20:00:00.000Z',
    }, 'cal-default');
    expect(graph.events.find((e) => e.id === id)!.start).toBe('2026-10-26T19:30:00.000Z');
    expect(graph.calls[0].body.start).toEqual({ dateTime: '2026-10-26T19:30:00.000', timeZone: 'UTC' });
  });
});

describe('Google and Apple paths still behave (checklist 9)', () => {
  it('Google refresh: invalid_grant → needs_reconnect, success keeps the refresh token', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }), { status: 400 }));
    const err = await ensureFreshToken(conn({ provider: 'google' })).catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.kind).toBe('needs_reconnect');

    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ access_token: 'g-new', expires_in: 3600 }), { status: 200 }));
    const tokens = await ensureFreshToken(conn({ provider: 'google' }));
    expect(tokens).toMatchObject({ access_token: 'g-new', refresh_token: 'refresh-0' });
  });

  it('Google delete treats 404/410 as already deleted; other errors still throw', async () => {
    const { googleDeleteEvent } = await import('@/lib/calendar-providers');
    vi.stubGlobal('fetch', async () => new Response('gone', { status: 410 }));
    await expect(googleDeleteEvent('t', 'primary', 'e1')).resolves.toBeUndefined();
    vi.stubGlobal('fetch', async () => new Response('boom', { status: 500 }));
    await expect(googleDeleteEvent('t', 'primary', 'e1')).rejects.toThrow('500');
  });

  it('Apple (CalDAV) connections never attempt an OAuth refresh', async () => {
    const apple = conn({ provider: 'apple', token_expires_at: null, access_token: 'apple-id', refresh_token: 'app-password' });
    expect(needsTokenRefresh(apple)).toBe(false);
    expect(await ensureFreshToken(apple)).toBeNull();
  });
});
