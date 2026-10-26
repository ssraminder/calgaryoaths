/**
 * Phone-width UI check for vendor/admin navigation and calendar status.
 *
 * Run (two terminals):
 *   node tests/e2e/mock-supabase.cjs
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
 *     SUPABASE_SERVICE_ROLE_KEY=dummy STRIPE_SECRET_KEY=sk_test_dummy npx next dev -p 3100
 * then:
 *   node tests/e2e/mobile-nav.cjs ./.verification
 *
 * The mock answers Supabase auth as a logged-in vendor; /api/* calls are stubbed per test.
 */
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = 'http://localhost:3100';
const OUT = process.argv[2] || '.verification';

const session = {
  access_token: 'fake', refresh_token: 'fake', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'vendor@example.com', app_metadata: {}, user_metadata: {} },
};
const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');

const conns = {
  needs_reconnect: [{ id: 'c1', provider: 'microsoft', calendar_id: 'cal', display_name: 'Calendar', sync_enabled: true, push_bookings: true, pull_busy_times: true, last_synced_at: '2026-04-08T00:13:03Z', created_at: '2026-04-08T00:12:55Z', status: 'needs_reconnect', last_error: 'token refresh: invalid_grant' }],
  config_error: [{ id: 'c1', provider: 'microsoft', calendar_id: 'cal', display_name: 'Calendar', sync_enabled: true, push_bookings: true, pull_busy_times: true, last_synced_at: '2026-04-08T00:13:03Z', created_at: '2026-04-08T00:12:55Z', status: 'config_error', last_error: 'AADSTS7000222' }],
  ok: [{ id: 'c1', provider: 'microsoft', calendar_id: 'cal', display_name: 'Calendar', sync_enabled: true, push_bookings: true, pull_busy_times: true, last_synced_at: new Date(Date.now() - 5 * 60000).toISOString(), created_at: '2026-04-08T00:12:55Z', status: 'active' }],
  none: [],
};

async function setup(context, state) {
  await context.route('**/api/calendar/connections', (r) => r.fulfill({ json: { connections: conns[state] } }));
  await context.route('**/api/vendor/bookings', (r) => r.fulfill({ json: [] }));
  await context.route('**/api/vendor/push', (r) => r.fulfill({ json: { subscribed: true } }));
  await context.route('**/api/vendor/availability', (r) => r.fulfill({ json: { rules: [], blockedDates: [], customTimes: [], locations: [] } }));
  await context.route('**/api/settings', (r) => r.fulfill({ json: {} }));
  await context.route('**/api/calendar/connect', (r) => r.fulfill({ json: { url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x&scope=Calendars.ReadWrite+offline_access' } }));
  await context.route('https://login.microsoftonline.com/**', (r) => r.fulfill({ body: '<html><body>Microsoft sign-in (stub)</body></html>', contentType: 'text/html' }));
}

async function noHorizontalScroll(page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert(sw <= iw, `horizontal scroll: scrollWidth ${sw} > innerWidth ${iw}`);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
  };

  for (const width of [360, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: 'sb-127-auth-token', value: cookieValue, url: BASE }]);
    await setup(context, 'needs_reconnect');
    const page = await context.newPage();

    await check(`[${width}px] dashboard shows Needs-reconnect card with Reconnect Outlook`, async () => {
      await page.goto(`${BASE}/vendor`, { waitUntil: 'networkidle', timeout: 120000 });
      const card = page.getByTestId('calendar-status-card');
      await card.waitFor({ timeout: 30000 });
      assert.strictEqual(await card.getAttribute('data-status'), 'needs_reconnect');
      await page.getByRole('button', { name: 'Reconnect Outlook' }).waitFor();
      await noHorizontalScroll(page);
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${width}-1-dashboard-needs-reconnect.png`, fullPage: true });
    });

    await check(`[${width}px] bottom nav has Calendar + Availability, fits the bar`, async () => {
      const nav = page.locator('nav.fixed.bottom-0');
      for (const label of ['Dashboard', 'Bookings', 'Availability', 'Calendar', 'More']) {
        const el = nav.getByText(label, { exact: true });
        assert(await el.isVisible(), `${label} not visible`);
        const box = await el.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width, `${label} overflows the bar`);
      }
    });

    await check(`[${width}px] More sheet lists Orders, Earnings, Settings + help`, async () => {
      await page.locator('nav.fixed.bottom-0').getByText('More', { exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'More' });
      for (const label of ['Orders', 'Earnings', 'Settings', 'Call Admin', 'Logout']) await sheet.getByText(label, { exact: true }).waitFor();
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${width}-2-more-sheet.png` });
      await page.getByRole('button', { name: 'Close menu' }).click();
    });

    await check(`[${width}px] Calendar tab → reconnect banner, Reconnect/Disconnect, Connect Google/Apple`, async () => {
      await page.locator('nav.fixed.bottom-0').getByText('Calendar', { exact: true }).click();
      await page.waitForURL('**/vendor/calendar', { timeout: 60000 });
      await page.getByTestId('reconnect-banner').waitFor({ timeout: 30000 });
      const card = page.getByTestId('connection-microsoft');
      await card.getByRole('button', { name: 'Reconnect' }).waitFor();
      await card.getByRole('button', { name: 'Disconnect' }).waitFor();
      await page.getByText('Connect Google Calendar').waitFor();
      await page.getByText('Connect Apple Calendar (iCloud)').waitFor();
      for (const t of ['Sync on', 'Block busy times', 'Add bookings to calendar']) await card.getByText(t).waitFor();
      await noHorizontalScroll(page);
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${width}-3-calendar-needs-reconnect.png`, fullPage: true });
    });

    await check(`[${width}px] Reconnect banner button goes straight to Microsoft OAuth`, async () => {
      await Promise.all([
        page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 }),
        page.getByTestId('reconnect-banner').getByRole('button', { name: 'Reconnect Outlook' }).click(),
      ]);
    });

    await check(`[${width}px] Availability tab works`, async () => {
      await page.goto(`${BASE}/vendor/calendar`, { waitUntil: 'networkidle' });
      await page.locator('nav.fixed.bottom-0').getByText('Availability', { exact: true }).click();
      await page.waitForURL('**/vendor/availability', { timeout: 60000 });
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${width}-4-availability.png` });
    });
    await context.close();
  }

  // Other states at 390px
  for (const state of ['none', 'config_error', 'ok']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: 'sb-127-auth-token', value: cookieValue, url: BASE }]);
    await setup(context, state);
    const page = await context.newPage();
    await check(`[390px] state=${state}: dashboard card + calendar page`, async () => {
      await page.goto(`${BASE}/vendor`, { waitUntil: 'networkidle', timeout: 120000 });
      const card = page.getByTestId('calendar-status-card');
      await card.waitFor({ timeout: 30000 });
      const expected = { none: 'not_connected', config_error: 'config_error', ok: 'ok' }[state];
      assert.strictEqual(await card.getAttribute('data-status'), expected);
      if (state === 'none') {
        await card.getByRole('button', { name: 'Connect Outlook' }).waitFor();
        await card.getByRole('button', { name: 'Connect Google' }).waitFor();
      }
      if (state === 'config_error') assert.strictEqual(await card.getByRole('button', { name: /Reconnect/ }).count(), 0);
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/390-5-dashboard-${state}.png`, fullPage: true });
      await page.goto(`${BASE}/vendor/calendar`, { waitUntil: 'networkidle' });
      if (state === 'none') {
        for (const t of ['Connect Outlook / Microsoft 365', 'Connect Google Calendar', 'Connect Apple Calendar (iCloud)']) await page.getByText(t).waitFor();
      }
      if (state === 'config_error') await page.getByTestId('config-error-banner').waitFor();
      if (state === 'ok') assert.strictEqual(await page.getByTestId('reconnect-banner').count(), 0);
      await noHorizontalScroll(page);
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/390-6-calendar-${state}.png`, fullPage: true });
    });
    await context.close();
  }

  // Admin mobile nav
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: 'sb-127-auth-token', value: cookieValue, url: BASE }]);
    await context.route('**/api/admin/**', (r) => r.fulfill({ json: {} }));
    const page = await context.newPage();
    await check('[390px] admin bottom nav + More sheet reach every admin page', async () => {
      await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 120000 });
      const nav = page.locator('nav.fixed.bottom-0');
      for (const label of ['Dashboard', 'Bookings', 'Orders', 'Vendors', 'More']) await nav.getByText(label, { exact: true }).waitFor();
      await nav.getByText('More', { exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'More' });
      for (const label of ['Reviews', 'Services', 'Locations', 'Analytics', 'Settings']) await sheet.getByText(label, { exact: true }).waitFor();
      await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/390-7-admin-more.png` });
      await sheet.getByText('Analytics', { exact: true }).click();
      await page.waitForURL('**/admin/analytics', { timeout: 60000 });
    });
    await context.close();
  }

  await browser.close();
  console.log(results.join('\n'));
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
