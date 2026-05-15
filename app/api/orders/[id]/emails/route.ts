import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';

interface BrevoEvent {
  email?: string;
  date?: string;
  messageId?: string;
  event?: string;
  subject?: string;
  link?: string;
  ip?: string;
}

interface EmailRow {
  id: string;
  order_id: string;
  message_id: string | null;
  recipient: string;
  subject: string;
  kind: string;
  attachments_json: string[] | null;
  triggered_by_name: string | null;
  sent_at: string;
}

async function fetchBrevoEvents(messageId: string, apiKey: string): Promise<BrevoEvent[]> {
  // Brevo accepts the messageId either with or without angle brackets.
  const url = `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&limit=100`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
    },
    // Brevo events lag a bit; do not cache aggressively
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Brevo events fetch error', res.status, body);
    return [];
  }
  const data = await res.json().catch(() => null) as { events?: BrevoEvent[] } | null;
  return data?.events || [];
}

function summarize(events: BrevoEvent[]) {
  const latest: Record<string, BrevoEvent> = {};
  for (const e of events) {
    const key = e.event || 'unknown';
    const existing = latest[key];
    if (!existing || (e.date && existing.date && e.date > existing.date)) {
      latest[key] = e;
    }
  }
  // Most-meaningful current status (priority order)
  const priority = ['hardBounces', 'softBounces', 'complaints', 'unsubscribed', 'blocked', 'clicked', 'opened', 'delivered', 'requests'];
  let status = 'queued';
  for (const e of priority) {
    if (latest[e]) { status = e; break; }
  }
  return {
    status,
    totals: {
      delivered: events.filter((e) => e.event === 'delivered').length,
      opened: events.filter((e) => e.event === 'opened').length,
      clicked: events.filter((e) => e.event === 'clicked').length,
      hardBounces: events.filter((e) => e.event === 'hardBounces').length,
      softBounces: events.filter((e) => e.event === 'softBounces').length,
      complaints: events.filter((e) => e.event === 'complaints').length,
      unsubscribed: events.filter((e) => e.event === 'unsubscribed').length,
    },
    last_event_at: events[0]?.date || null,
    events,
  };
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;

  const { data, error } = await supabaseAdmin
    .from('co_order_emails')
    .select('id, order_id, message_id, recipient, subject, kind, attachments_json, triggered_by_name, sent_at')
    .eq('order_id', id)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('co_order_emails fetch error', error);
    return NextResponse.json({ error: 'Failed to load email log' }, { status: 500 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const rows = (data || []) as EmailRow[];

  // Fetch Brevo events in parallel for rows with a message_id
  const enriched = await Promise.all(rows.map(async (row) => {
    let tracking: ReturnType<typeof summarize> | null = null;
    if (apiKey && row.message_id) {
      try {
        const events = await fetchBrevoEvents(row.message_id, apiKey);
        tracking = summarize(events);
      } catch (err) {
        console.error('fetchBrevoEvents failed', err);
      }
    }
    return { ...row, tracking };
  }));

  return NextResponse.json({ emails: enriched });
}
