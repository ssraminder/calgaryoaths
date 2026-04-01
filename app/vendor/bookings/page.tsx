'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/admin/StatusBadge';

type Booking = {
  id: string;
  name: string;
  email: string;
  service_name: string;
  appointment_datetime: string | null;
  proposed_datetime: string | null;
  status: string;
  vendor_payout_cents: number | null;
  created_at: string;
};

const STATUSES = ['paid', 'confirmed', 'pending_scheduling', 'cancelled', 'completed'];

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
  const [filter, setFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    const params = filter ? `?status=${filter}` : '';
    fetch(`/api/vendor/bookings${params}`)
      .then((r) => r.json())
      .then((d) => { setBookings(d ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>

      <div className="flex gap-2">
        <button onClick={() => setFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium ${!filter ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.vendor_payout_cents != null ? `$${(b.vendor_payout_cents / 100).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No bookings found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
