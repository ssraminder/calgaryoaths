// Netlify scheduled function: runs the calendar sync every 15 minutes.
// Refreshes OAuth tokens, pulls busy times into co_custom_times, backfills missing
// booking events, and retries broken connections so they recover on their own.
//
// The work happens in the Next.js route /api/calendar/sync; this function only
// triggers it. Requires CRON_SECRET in the Netlify environment (same value the
// route checks). URL is set by Netlify to the site's primary URL.

export default async function handler(): Promise<Response> {
  const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.error('[calendar-sync] URL/NEXT_PUBLIC_SITE_URL or CRON_SECRET is not set; skipping');
    return new Response('not configured', { status: 500 });
  }

  const res = await fetch(`${baseUrl}/api/calendar/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[calendar-sync] sync failed (${res.status}): ${body.slice(0, 500)}`);
  } else {
    console.log(`[calendar-sync] ${body.slice(0, 1000)}`);
  }
  return new Response(null, { status: res.ok ? 200 : 502 });
}

export const config = {
  schedule: '*/15 * * * *',
};
