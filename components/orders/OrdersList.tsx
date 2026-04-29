'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, FileText, Stamp } from 'lucide-react';
import { formatCents } from '@/lib/orders/pricing';

type OrderRow = {
  id: string;
  order_number: string;
  order_type: 'apostille' | 'notarization';
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
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

export default function OrdersList({ basePath }: { basePath: '/vendor/orders' | '/admin/orders' | '/tablet/orders' }) {
  const router = useRouter();
  const search = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [type, setType] = useState(search.get('type') || '');
  const [status, setStatus] = useState(search.get('status') || '');
  const [q, setQ] = useState(search.get('q') || '');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const r = await fetch(`/api/orders?${params.toString()}`);
    if (r.ok) {
      const d = await r.json();
      setOrders(d.orders || []);
    }
    setLoading(false);
  }, [type, status, q]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        <Link
          href={`${basePath}/new`}
          className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
        >
          <Plus className="h-4 w-4" /> New order
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-md border border-gray-200 bg-white p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, customer name, email"
          className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="apostille">Apostille</option>
          <option value="notarization">Notarization</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No orders yet</p>
            <Link href={`${basePath}/new`} className="mt-3 inline-block text-sm text-navy underline">Create the first order</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Order #</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                  onClick={() => router.push(`${basePath}/${o.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{o.order_number}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Stamp className="h-3.5 w-3.5" />
                      {o.order_type === 'apostille' ? 'Apostille' : 'Notary / Oath'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{o.customer_name || <span className="text-gray-400">—</span>}</div>
                    {o.customer_email && <div className="text-xs text-gray-500">{o.customer_email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[o.status] || 'bg-gray-100 text-gray-700'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCents(o.total_cents)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
