'use client';

import { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderEvent {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  event_type: string;
  summary: string;
  changes_json: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  orderId: string;
  /** Bumped by parent after every PATCH so the log re-fetches. */
  refreshKey?: number;
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

export default function OrderEventsLog({ orderId, refreshKey }: Props) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/orders/${orderId}/events`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.events) setEvents(d.events); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId, refreshKey]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <History className="h-4 w-4" /> Change history
          {!loading && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{events.length}</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-gray-500">No staff edits recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((e) => {
                const hasDetail = e.changes_json && Object.keys(e.changes_json).length > 0;
                const isExpanded = expandedId === e.id;
                return (
                  <li key={e.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 break-words">{e.summary}</p>
                        <p className="text-gray-500">
                          {e.actor_name || 'System'}{e.actor_role ? ` (${e.actor_role})` : ''} . {new Date(e.created_at).toLocaleString()}
                        </p>
                      </div>
                      {hasDetail && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : e.id)}
                          className="shrink-0 text-navy hover:underline"
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </div>
                    {hasDetail && isExpanded && (
                      <dl className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                        {Object.entries(e.changes_json || {}).map(([key, val]) => {
                          if (val && typeof val === 'object' && 'from' in (val as Record<string, unknown>) && 'to' in (val as Record<string, unknown>)) {
                            const v = val as { from: unknown; to: unknown };
                            return (
                              <div key={key} className="grid grid-cols-[max-content_1fr] gap-x-2 text-[11px]">
                                <dt className="font-medium text-gray-600">{key}</dt>
                                <dd className="text-gray-700 break-words">
                                  <span className="text-gray-400 line-through">{formatValue(v.from)}</span>
                                  {' → '}
                                  <span>{formatValue(v.to)}</span>
                                </dd>
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="grid grid-cols-[max-content_1fr] gap-x-2 text-[11px]">
                              <dt className="font-medium text-gray-600">{key}</dt>
                              <dd className="text-gray-700 break-words">{formatValue(val)}</dd>
                            </div>
                          );
                        })}
                      </dl>
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
