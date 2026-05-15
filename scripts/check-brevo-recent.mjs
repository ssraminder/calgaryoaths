#!/usr/bin/env node
// One-off: print the most recent transactional emails sent via Brevo.
//
// Usage:
//   BREVO_API_KEY=xkeysib-... node scripts/check-brevo-recent.mjs
//   BREVO_API_KEY=xkeysib-... node scripts/check-brevo-recent.mjs --email someone@example.com
//   BREVO_API_KEY=xkeysib-... node scripts/check-brevo-recent.mjs --limit 20 --days 1
//
// Flags:
//   --email <addr>   filter to a single recipient
//   --limit <n>      max events to fetch (default 30)
//   --days <n>       only events in the last N days (default 1)

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error('BREVO_API_KEY is not set in the environment. Set it and re-run.');
  process.exit(1);
}

const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const limit = Number(flag('limit', '30'));
const days = Number(flag('days', '1'));
const email = flag('email', null);

const params = new URLSearchParams({ limit: String(limit), days: String(days) });
if (email) params.set('email', email);

const url = `https://api.brevo.com/v3/smtp/statistics/events?${params.toString()}`;

const res = await fetch(url, {
  headers: { accept: 'application/json', 'api-key': apiKey },
});

if (!res.ok) {
  console.error(`Brevo API ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const events = data.events || [];

if (events.length === 0) {
  console.log(`No events found in the last ${days} day(s)${email ? ` for ${email}` : ''}.`);
  process.exit(0);
}

// Group by messageId so each email is one block
const byMessage = new Map();
for (const ev of events) {
  const key = ev.messageId || '(no message id)';
  if (!byMessage.has(key)) byMessage.set(key, []);
  byMessage.get(key).push(ev);
}

const blocks = [...byMessage.entries()]
  .map(([messageId, evs]) => {
    const sorted = evs.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const first = sorted[0];
    return { messageId, first, events: sorted };
  })
  .sort((a, b) => (b.first.date || '').localeCompare(a.first.date || ''));

const pad = (s, n) => String(s ?? '').padEnd(n);

console.log(`Brevo: ${blocks.length} message(s) in the last ${days} day(s)${email ? ` for ${email}` : ''}\n`);

for (const block of blocks) {
  console.log(`messageId: ${block.messageId}`);
  console.log(`  to:      ${block.first.email || '?'}`);
  console.log(`  subject: ${block.first.subject || '?'}`);
  console.log(`  events:`);
  for (const ev of block.events) {
    const when = ev.date ? new Date(ev.date).toLocaleString() : '?';
    const extra = ev.link ? ` link=${ev.link}` : (ev.ip ? ` ip=${ev.ip}` : '');
    console.log(`    ${pad(ev.event, 14)} ${when}${extra}`);
  }
  console.log('');
}
