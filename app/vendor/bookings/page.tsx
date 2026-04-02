'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/admin/StatusBadge';
import PullToRefresh from '@/components/vendor/PullToRefresh';

type Booking = {
  id: string;
  name: string;
  email: string;
  service_name: string;
  appointment_datetime: string | null;
  proposed_datetime: string | null;
  status: string;
  vendor_payout_cents: number | null;
  vendor_total_payout_cents: number | null;
  created_at: string;
};

const STATUSES = ['paid', 'confirmed', 'pending_scheduling', 'pending_cancellation', 'cancelled', 'completed'];

export default function VendorBookingsPage() {
  return (
    <Suspense>
      <VendorBookingsContent />
    </Suspense>
  );
}

function VendorBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('status') || 'paid');

  const fetchBookings = useCallback(async () => {
    const params = filter ? `?status=${filter}` : '';
    const r = await fetch(`/api/vendor/bookings${params}`);
    const d = await r.json();
    setBookings(d ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  return (
    <PullToRefresh onRefresh={fetchBookings}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Bookings</h1>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('')} className={`rounded-full px-3 py-1.5 text-xs font-medium min-h-[36px] ${!filter ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-medium min-h-[36px] ${filter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/vendor/bookings/${b.id}`)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{b.name}</p>
                      <p className="text-xs text-gray-400 truncate">{b.email}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{b.service_name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {b.appointment_datetime ? new Date(b.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </span>
                    <span className="font-medium text-gray-700">
                      {b.vendor_total_payout_cents != null ? `$${(b.vendor_total_payout_cents / 100).toFixed(2)}` : b.vendor_payout_cents != null ? `$${(b.vendor_payout_cents / 100).toFixed(2)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No bookings found</p>}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Requested Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((b) => (
                    <tr key={b.id} onClick={() => router.push(`/vendor/bookings/${b.id}`)} className="cursor-pointer hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><div className="text-gray-900">{b.name}</div><div className="text-xs text-gray-400">{b.email}</div></td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.service_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {b.appointment_datetime ? new Date(b.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><StatusBadge status={b.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.vendor_total_payout_cents != null ? `$${(b.vendor_total_payout_cents / 100).toFixed(2)}` : b.vendor_payout_cents != null ? `$${(b.vendor_payout_cents / 100).toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No bookings found</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
