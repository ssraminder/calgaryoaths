'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Stamp, ListChecks, ArrowRight, Clock } from 'lucide-react';
import { formatCents } from '@/lib/orders/pricing';

type RecentOrder = {
  id: string;
  order_number: string;
  order_type: 'apostille' | 'notarization';
  status: string;
  customer_name: string | null;
  total_cents: number;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  awaiting_customer: 'bg-amber-100 text-amber-800',
  customer_completed: 'bg-blue-100 text-blue-800',
  awaiting_payment: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TabletHomePage() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [creating, setCreating] = useState<'apostille' | 'notarization' | null>(null);

  useEffect(() => {
    fetch('/api/orders?limit=6')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.orders) setRecent(d.orders); })
      .catch(() => {});
  }, []);

  async function startOrder(orderType: 'apostille' | 'notarization') {
    setCreating(orderType);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: orderType }),
      });
      if (!res.ok) {
        alert('Failed to start order');
        return;
      }
      const data = await res.json();
      router.push(`/tablet/orders/${data.id}`);
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">What would you like to do?</h1>
        <p className="mt-1 text-sm text-gray-500">Start a new order or pick up where you left off.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => startOrder('apostille')}
          disabled={creating !== null}
          className="group rounded-xl border-2 border-gray-200 bg-white p-6 md:p-8 text-left transition-all hover:border-navy hover:shadow-md active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-navy/10 text-navy">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">New Apostille Order</h2>
          <p className="mt-1 text-sm text-gray-500">
            Authenticate documents for a foreign country. Apostille (Hague), authentication + legalization, expedited options.
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-navy">
            Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
          {creating === 'apostille' && <p className="mt-2 text-xs text-navy">Creating…</p>}
        </button>

        <button
          type="button"
          onClick={() => startOrder('notarization')}
          disabled={creating !== null}
          className="group rounded-xl border-2 border-gray-200 bg-white p-6 md:p-8 text-left transition-all hover:border-navy hover:shadow-md active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-navy/10 text-navy">
            <Stamp className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">New Notarization Order</h2>
          <p className="mt-1 text-sm text-gray-500">
            Notary public or commissioner of oaths. Affidavits, statutory declarations, true copies, witnessing of signatures.
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-navy">
            Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
          {creating === 'notarization' && <p className="mt-2 text-xs text-navy">Creating…</p>}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">Recent orders</h2>
          <Link href="/tablet/orders" className="flex items-center gap-1 text-sm text-navy hover:underline">
            <ListChecks className="h-4 w-4" /> View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
            No recent orders
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/tablet/orders/${o.id}`}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-navy hover:bg-navy/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{o.order_number}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[o.status] || 'bg-gray-100 text-gray-700'}`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 truncate">{o.customer_name || <span className="text-gray-400">No customer yet</span>}</p>
                    <p className="mt-0.5 text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{formatCents(o.total_cents)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
