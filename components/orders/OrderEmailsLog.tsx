'use client';

import { useEffect, useState } from 'react';
import { Mail, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Eye, MousePointerClick, AlertCircle, Clock } from 'lucide-react';

interface BrevoEvent {
  email?: string;
  date?: string;
  messageId?: string;
  event?: string;
  subject?: string;
  link?: string;
  ip?: string;
}

interface Tracking {
  status: string;
  totals: {
    delivered: number;
    opened: number;
    clicked: number;
    hardBounces: number;
    softBounces: number;
    complaints: number;
    unsubscribed: number;
  };
  last_event_at: string | null;
  events: BrevoEvent[];
}

interface EmailRow {
  id: string;
  message_id: string | null;
  recipient: string;
  subject: string;
  kind: string;
  attachments_json: string[] | null;
  triggered_by_name: string | null;
  sent_at: string;
  tracking: Tracking | null;
}

interface Props {
  orderId: string;
  refreshKey?: number;
}

const KIND_LABELS: Record<string, string> = {
  signed_terms_on_submit: 'Signed terms (on submit)',
  invoice_terms: 'Invoice / terms',
  cancellation_customer: 'Cancellation notice (customer)',
  cancellation_partner: 'Cancellation notice (partner)',
  other: 'Email',
};

const STATUS_TONES: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800',
  opened: 'bg-blue-100 text-blue-800',
  clicked: 'bg-indigo-100 text-indigo-800',
  requests: 'bg-amber-100 text-amber-800',
  queued: 'bg-gray-100 text-gray-700',
  hardBounces: 'bg-red-100 text-red-800',
  softBounces: 'bg-orange-100 text-orange-800',
  complaints: 'bg-red-100 text-red-800',
  unsubscribed: 'bg-gray-200 text-gray-700',
  blocked: 'bg-red-100 text-red-800',
};

function statusLabel(s: string): string {
  switch (s) {
    case 'requests': return 'Accepted';
    case 'queued': return 'Queued';
    case 'delivered': return 'Delivered';
    case 'opened': return 'Opened';
    case 'clicked': return 'Clicked';
    case 'hardBounces': return 'Hard bounce';
    case 'softBounces': return 'Soft bounce';
    case 'complaints': return 'Complaint';
    case 'unsubscribed': return 'Unsubscribed';
    case 'blocked': return 'Blocked';
    default: return s;
  }
}

export default function OrderEmailsLog({ orderId, refreshKey }: Props) {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(emails.length === 0);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/emails`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshKey]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Mail className="h-4 w-4" /> Email log
          {!loading && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{emails.length}</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">Delivery, open, and click events from Brevo.</p>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : emails.length === 0 ? (
            <p className="text-xs text-gray-500">No emails sent for this order yet.</p>
          ) : (
            <ol className="space-y-2">
              {emails.map((e) => {
                const status = e.tracking?.status || 'queued';
                const tone = STATUS_TONES[status] || 'bg-gray-100 text-gray-700';
                const expanded = expandedId === e.id;
                const totals = e.tracking?.totals;
                return (
                  <li key={e.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>{statusLabel(status)}</span>
                          <span className="text-gray-700 font-medium">{KIND_LABELS[e.kind] || e.kind}</span>
                        </div>
                        <p className="mt-1 text-gray-700 break-words">{e.subject}</p>
                        <p className="text-gray-500">
                          To: {e.recipient} . Sent {new Date(e.sent_at).toLocaleString()}
                          {e.triggered_by_name && ` . by ${e.triggered_by_name}`}
                        </p>
                        {e.attachments_json && e.attachments_json.length > 0 && (
                          <p className="text-gray-500">Attached: {e.attachments_json.join(', ')}</p>
                        )}
                        {totals && (
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
                            {totals.delivered > 0 && <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-green-600" /> Delivered {totals.delivered}</span>}
                            {totals.opened > 0 && <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3 text-blue-600" /> Opened {totals.opened}</span>}
                            {totals.clicked > 0 && <span className="inline-flex items-center gap-0.5"><MousePointerClick className="h-3 w-3 text-indigo-600" /> Clicked {totals.clicked}</span>}
                            {(totals.hardBounces + totals.softBounces) > 0 && <span className="inline-flex items-center gap-0.5 text-red-700"><AlertCircle className="h-3 w-3" /> Bounced {totals.hardBounces + totals.softBounces}</span>}
                            {e.tracking?.last_event_at && <span className="inline-flex items-center gap-0.5 text-gray-500"><Clock className="h-3 w-3" /> {new Date(e.tracking.last_event_at).toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                      {e.tracking?.events && e.tracking.events.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : e.id)}
                          className="shrink-0 text-navy hover:underline"
                        >
                          {expanded ? 'Hide' : 'Events'}
                        </button>
                      )}
                    </div>
                    {expanded && e.tracking?.events && (
                      <ol className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                        {e.tracking.events.map((ev, idx) => (
                          <li key={idx} className="grid grid-cols-[max-content_max-content_1fr] gap-x-2 text-[11px]">
                            <span className="text-gray-500">{ev.date ? new Date(ev.date).toLocaleString() : ''}</span>
                            <span className="font-medium text-gray-700">{statusLabel(ev.event || '')}</span>
                            <span className="text-gray-500 break-words">{ev.link || ev.ip || ''}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {!e.message_id && (
                      <p className="mt-1 text-[10px] text-gray-400">No message id recorded — tracking unavailable.</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
