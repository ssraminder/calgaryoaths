/**
 * Fake Microsoft identity platform + Graph calendar, installed as global fetch.
 * Events are stored in UTC; responses mimic Graph with Prefer: outlook.timezone="UTC".
 */
export type FakeEvent = {
  id: string;
  subject: string;
  start: string; // UTC ISO
  end: string;   // UTC ISO
  showAs?: string;
  isAllDay?: boolean;
  isCancelled?: boolean;
  body?: string;
  location?: string;
};

export type TokenBehaviour = 'ok' | 'expired_secret' | 'invalid_grant' | 'server_error';

export class FakeGraph {
  events: FakeEvent[] = [];
  tokenBehaviour: TokenBehaviour = 'ok';
  validAccessTokens = new Set<string>(['initial-access']);
  calls: { method: string; url: string; body?: any }[] = [];
  refreshCount = 0;
  private seq = 0;

  /** Graph dateTime as returned with outlook.timezone="UTC": no zone suffix, 7 fractional digits. */
  private graphTime(iso: string) {
    return { dateTime: new Date(iso).toISOString().replace('Z', '').replace(/\.(\d{3})$/, '.$10000'), timeZone: 'UTC' };
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || 'GET').toUpperCase();
    let body: any;
    if (typeof init?.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    } else if (init?.body instanceof URLSearchParams) {
      body = Object.fromEntries(init.body);
    }
    this.calls.push({ method, url, body });

    if (url.startsWith('https://login.microsoftonline.com/')) return this.token(body);
    if (url.startsWith('https://graph.microsoft.com/v1.0')) {
      const auth = new Headers(init?.headers).get('authorization') || '';
      if (!this.validAccessTokens.has(auth.replace('Bearer ', ''))) {
        return json(401, { error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired' } });
      }
      return this.graph(method, new URL(url), body);
    }
    throw new Error(`FakeGraph: unexpected fetch ${method} ${url}`);
  };

  private token(body: Record<string, string>): Response {
    if (this.tokenBehaviour === 'expired_secret') {
      return json(401, {
        error: 'invalid_client',
        error_description: "AADSTS7000222: The provided client secret keys for app 'test-app' are expired. Visit the Azure portal to create new keys for your app. Trace ID: abc Correlation ID: def",
      });
    }
    if (this.tokenBehaviour === 'invalid_grant') {
      return json(400, {
        error: 'invalid_grant',
        error_description: 'AADSTS70008: The provided authorization code or refresh token has expired due to inactivity. Trace ID: abc',
      });
    }
    if (this.tokenBehaviour === 'server_error') {
      return json(500, { error: 'temporarily_unavailable', error_description: 'try again' });
    }
    this.refreshCount++;
    const access = `access-${this.refreshCount}`;
    this.validAccessTokens.add(access);
    return json(200, {
      token_type: 'Bearer',
      access_token: access,
      refresh_token: `rotated-refresh-${this.refreshCount}`,
      expires_in: 3600,
      scope: body.scope || 'Calendars.ReadWrite',
    });
  }

  private graph(method: string, url: URL, body: any): Response {
    const path = url.pathname.replace('/v1.0', '');
    if (method === 'GET' && path === '/me/calendars') {
      return json(200, { value: [{ id: 'cal-default', name: 'Calendar', isDefaultCalendar: true }] });
    }
    if (method === 'GET' && /\/calendarView$/.test(path)) {
      const start = Date.parse(url.searchParams.get('startDateTime')!);
      const end = Date.parse(url.searchParams.get('endDateTime')!);
      const value = this.events
        .filter((e) => Date.parse(e.start) < end && Date.parse(e.end) > start)
        .map((e) => ({
          id: e.id,
          subject: e.subject,
          showAs: e.showAs ?? 'busy',
          isAllDay: !!e.isAllDay,
          isCancelled: !!e.isCancelled,
          start: e.isAllDay ? { dateTime: `${e.start.slice(0, 10)}T00:00:00.0000000`, timeZone: 'UTC' } : this.graphTime(e.start),
          end: e.isAllDay ? { dateTime: `${e.end.slice(0, 10)}T00:00:00.0000000`, timeZone: 'UTC' } : this.graphTime(e.end),
        }));
      return json(200, { value });
    }
    if (method === 'POST' && /\/events$/.test(path)) {
      if (body.start.timeZone !== 'UTC' || /Z$/.test(body.start.dateTime)) {
        return json(400, { error: { message: 'test expects UTC dateTime without offset' } });
      }
      const id = `evt-${++this.seq}`;
      this.events.push({
        id,
        subject: body.subject,
        start: new Date(`${body.start.dateTime}Z`).toISOString(),
        end: new Date(`${body.end.dateTime}Z`).toISOString(),
        body: body.body?.content,
        location: body.location?.displayName,
      });
      return json(201, { id });
    }
    const evMatch = path.match(/^\/me\/events\/([^/]+)$/);
    if (evMatch) {
      const id = decodeURIComponent(evMatch[1]);
      const ev = this.events.find((e) => e.id === id);
      if (!ev) return json(404, { error: { code: 'ErrorItemNotFound' } });
      if (method === 'DELETE') {
        this.events = this.events.filter((e) => e.id !== id);
        return new Response(null, { status: 204 });
      }
      if (method === 'PATCH') {
        ev.subject = body.subject;
        ev.start = new Date(`${body.start.dateTime}Z`).toISOString();
        ev.end = new Date(`${body.end.dateTime}Z`).toISOString();
        ev.body = body.body?.content;
        ev.location = body.location?.displayName;
        return json(200, { id });
      }
    }
    throw new Error(`FakeGraph: unhandled ${method} ${path}`);
  }
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
