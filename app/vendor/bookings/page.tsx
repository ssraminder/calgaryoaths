'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
  delivery_mode: string | null;
  location_name: string | null;
  created_at: string;
};

const STATUSES = ['paid', 'confirmed', 'pending_scheduling', 'pending_cancellation', 'cancelled', 'completed'];

/** Finished statuses always go to the archive, whatever their date. */
const CLOSED_STATUSES = ['cancelled', 'completed', 'refunded', 'rejected', 'no_show', 'customer_completed'];

type View = 'upcoming' | 'archive' | 'all';

/** Start of today in Calgary — today's appointments stay in Upcoming until the day is over. */
function startOfTodayCalgary(): number {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
  const [y, m, d] = ymd.split('-').map(Number);
  // Calgary is UTC-6 (MDT) or UTC-7 (MST); pick the offset that lands on local midnight
  for (const offset of [6, 7]) {
    const t = Date.UTC(y, m - 1, d, offset);
    if (new Date(t).toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', hourCycle: 'h23' }).startsWith('00')) return t;
  }
  return Date.UTC(y, m - 1, d, 7);
}

function isUpcoming(b: Booking, todayStart: number): boolean {
  if (CLOSED_STATUSES.includes(b.status)) return false;
  // No time yet (pending scheduling) still needs attention
  if (!b.appointment_datetime) return true;
  return new Date(b.appointment_datetime).getTime() >= todayStart;
}

function locationLabel(b: Booking): string {
  if (b.delivery_mode === 'mobile') return 'Mobile';
  if (b.delivery_mode === 'virtual') return 'Virtual';
  return b.location_name || '';
}

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
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  // Links like ?status=paid (from the dashboard) show that status across all dates
  const initialStatus = searchParams.get('status') || '';
  const [view, setView] = useState<View>(initialStatus ? 'all' : 'upcoming');
  const [filter, setFilter] = useState(initialStatus);

  const fetchBookings = useCallback(async () => {
    const r = await fetch('/api/vendor/bookings');
    const d = await r.json();
    setAllBookings(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const { upcoming, archive } = useMemo(() => {
    const todayStart = startOfTodayCalgary();
    const time = (b: Booking) => (b.appointment_datetime ? new Date(b.appointment_datetime).getTime() : null);
    const up = allBookings
      .filter((b) => isUpcoming(b, todayStart))
      // Soonest first; bookings still needing a time go to the top
      .sort((a, b) => (time(a) ?? -Infinity) - (time(b) ?? -Infinity));
    const past = allBookings
      .filter((b) => !isUpcoming(b, todayStart))
      .sort((a, b) => (time(b) ?? 0) - (time(a) ?? 0));
    return { upcoming: up, archive: past };
  }, [allBookings]);

  const inView = view === 'upcoming' ? upcoming : view === 'archive' ? archive : allBookings;
  const bookings = filter ? inView.filter((b) => b.status === filter) : inView;
  const viewTabs: { key: View; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'archive', label: 'Archive', count: archive.length },
    { key: 'all', label: 'All', count: allBookings.length },
  ];

  return (
    <PullToRefresh onRefresh={fetchBookings}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Bookings</h1>
          <button
            onClick={() => router.push('/vendor/bookings/new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90 min-h-[40px]"
          >
            + New
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist" aria-label="Booking view">
          {viewTabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={view === t.key}
              onClick={() => setView(t.key)}
              className={`min-h-[36px] rounded-md px-4 py-1.5 text-sm font-medium ${view === t.key ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.label} <span className={view === t.key ? 'text-white/70' : 'text-gray-400'}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('')} className={`rounded-full px-3 py-1.5 text-xs font-medium min-h-[36px] ${!filter ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Any status</button>
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
                  <p className="mt-1 text-sm text-gray-600">{b.service_name}{locationLabel(b) && <span className="text-gray-400"> · {locationLabel(b)}</span>}</p>
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
              {bookings.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{view === 'upcoming' ? 'No upcoming bookings' : 'No bookings found'}</p>}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
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
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{locationLabel(b) || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {b.appointment_datetime ? new Date(b.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><StatusBadge status={b.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.vendor_total_payout_cents != null ? `$${(b.vendor_total_payout_cents / 100).toFixed(2)}` : b.vendor_payout_cents != null ? `$${(b.vendor_payout_cents / 100).toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">{view === 'upcoming' ? 'No upcoming bookings' : 'No bookings found'}</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
