'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Clock, TrendingUp, CalendarCheck, ChevronDown, ChevronUp, Info, Banknote } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Summary = {
  next_payout_cents: number;
  last_paid_cents: number;
  last_paid_at: string | null;
  total_earned_cents: number;
  bookings_this_month: number;
  gst_registered: boolean;
  commission_rate: number;
};

type Batch = {
  id: string;
  period_start: string;
  period_end: string;
  booking_count: number;
  total_cents: number;
  gst_cents: number;
  total_with_gst_cents: number;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
};

type Booking = {
  id: string;
  service_name: string;
  appointment_datetime: string;
  delivery_mode: string | null;
  total_charged_cents: number | null;
  platform_fee_cents: number | null;
  travel_fee_cents: number | null;
  vendor_payout_cents: number | null;
  vendor_gst_cents: number | null;
  vendor_total_payout_cents: number | null;
  completed_at: string | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (cents: number | null | undefined) =>
  `$${((cents ?? 0) / 100).toFixed(2)}`;

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const fmtPeriod = (start: string, end: string) =>
  `${fmtDate(start)} – ${fmtDate(end)}`;

const modeBadge = (mode: string | null) => {
  const labels: Record<string, { text: string; cls: string }> = {
    in_person: { text: 'In-person', cls: 'bg-blue-50 text-blue-700' },
    mobile: { text: 'Mobile', cls: 'bg-amber-50 text-amber-700' },
    virtual: { text: 'Virtual', cls: 'bg-purple-50 text-purple-700' },
  };
  const m = labels[mode ?? ''] ?? { text: mode ?? 'N/A', cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.text}
    </span>
  );
};

const statusBadge = (status: string) => {
  const map: Record<string, { text: string; cls: string }> = {
    ready: { text: 'Ready to pay', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    paid: { text: 'Paid', cls: 'bg-green-50 text-green-700 border-green-200' },
    cancelled: { text: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const s = map[status] ?? { text: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.text}
    </span>
  );
};

const paymentMethodLabel = (m: string | null) => {
  const map: Record<string, string> = {
    stripe_transfer: 'Stripe',
    e_transfer: 'e-Transfer',
    manual: 'Manual',
  };
  return map[m ?? ''] ?? m ?? '';
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VendorEarningsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/earnings');
      if (!res.ok) throw new Error('Failed to load earnings');
      const data = await res.json();
      setSummary(data.summary);
      setBatches(data.batches);
      setPendingBookings(data.pending_bookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadData} className="mt-3 text-sm font-medium text-navy hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Earnings</h1>
        <button
          onClick={() => setShowExplainer((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">How it works</span>
        </button>
      </div>

      {/* Explainer */}
      {showExplainer && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-sm text-gray-700 space-y-2">
          <p className="font-medium text-gray-900">How your earnings are calculated</p>
          <p>
            <strong>Your earnings</strong> = what the client pays for the service, minus our {summary.commission_rate}% platform commission.
            The $4.99 convenience fee charged to the client is a separate platform fee and is not included in your payout calculation.
          </p>
          {summary.gst_registered ? (
            <p>
              Since you are <strong>GST registered</strong>, we add 5% GST on top of your payout.
              You collect this GST and remit it to the CRA.
            </p>
          ) : (
            <p>
              You are not currently registered for GST. If you register, let us know in
              Settings and we will add GST to your payouts.
            </p>
          )}
          <p>
            Payouts are batched weekly. Once a batch is created, the admin reviews and
            sends your payment via e-Transfer or Stripe.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Next payout"
          value={fmt(summary.next_payout_cents)}
          icon={Clock}
          highlight={summary.next_payout_cents > 0}
        />
        <StatCard
          label="Last paid"
          value={summary.last_paid_at ? fmt(summary.last_paid_cents) : '—'}
          icon={Banknote}
        />
        <StatCard
          label="Total earned"
          value={fmt(summary.total_earned_cents)}
          icon={TrendingUp}
        />
        <StatCard
          label="This month"
          value={summary.bookings_this_month}
          icon={CalendarCheck}
        />
      </div>

      {/* Pending earnings */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Pending Earnings
          {pendingBookings.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pendingBookings.length} booking{pendingBookings.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>

        {pendingBookings.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No pending earnings right now.</p>
            <p className="text-xs text-gray-400">Completed bookings will appear here until they are batched for payout.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {pendingBookings.map((b) => (
                <PendingBookingCard key={b.id} booking={b} gstRegistered={summary.gst_registered} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Service</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Mode</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Client paid</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Commission</th>
                    {pendingBookings.some((b) => (b.travel_fee_cents ?? 0) > 0) && (
                      <th className="px-4 py-3 text-right font-medium text-gray-500">Travel fee</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Earnings</th>
                    {summary.gst_registered && (
                      <th className="px-4 py-3 text-right font-medium text-gray-500">GST</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium text-gray-500">You receive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingBookings.map((b) => {
                    const hasTravel = pendingBookings.some((bk) => (bk.travel_fee_cents ?? 0) > 0);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{b.service_name}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(b.appointment_datetime)}</td>
                        <td className="px-4 py-3">{modeBadge(b.delivery_mode)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(b.total_charged_cents)}</td>
                        <td className="px-4 py-3 text-right text-red-500">−{fmt(b.platform_fee_cents)}</td>
                        {hasTravel && (
                          <td className="px-4 py-3 text-right text-gray-600">
                            {(b.travel_fee_cents ?? 0) > 0 ? fmt(b.travel_fee_cents) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-gray-900">{fmt(b.vendor_payout_cents)}</td>
                        {summary.gst_registered && (
                          <td className="px-4 py-3 text-right text-gray-500">
                            {(b.vendor_gst_cents ?? 0) > 0 ? `+${fmt(b.vendor_gst_cents)}` : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-navy">{fmt(b.vendor_total_payout_cents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="text-xs text-gray-500">
                  Pending — these will be included in the next weekly payout batch.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Payout history */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Payout History</h2>

        {batches.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <Banknote className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No payouts yet.</p>
            <p className="text-xs text-gray-400">Your payout history will appear here once your first batch is processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <BatchRow key={batch.id} batch={batch} gstRegistered={summary.gst_registered} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pending booking card (mobile)                                      */
/* ------------------------------------------------------------------ */

function PendingBookingCard({ booking: b, gstRegistered }: { booking: Booking; gstRegistered: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{b.service_name}</p>
          <p className="text-xs text-gray-500">{fmtDate(b.appointment_datetime)}</p>
        </div>
        {modeBadge(b.delivery_mode)}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Client paid</span>
        <span className="text-right text-gray-700">{fmt(b.total_charged_cents)}</span>

        <span className="text-gray-500">Commission</span>
        <span className="text-right text-red-500">−{fmt(b.platform_fee_cents)}</span>

        {(b.travel_fee_cents ?? 0) > 0 && (
          <>
            <span className="text-gray-500">Travel fee</span>
            <span className="text-right text-gray-700">{fmt(b.travel_fee_cents)}</span>
          </>
        )}

        <span className="text-gray-500">Earnings</span>
        <span className="text-right text-gray-900">{fmt(b.vendor_payout_cents)}</span>

        {gstRegistered && (b.vendor_gst_cents ?? 0) > 0 && (
          <>
            <span className="text-gray-500">GST</span>
            <span className="text-right text-gray-500">+{fmt(b.vendor_gst_cents)}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-sm text-gray-500">You receive</span>
        <span className="text-base font-semibold text-navy">{fmt(b.vendor_total_payout_cents)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch row (expandable)                                             */
/* ------------------------------------------------------------------ */

function BatchRow({ batch, gstRegistered }: { batch: Batch; gstRegistered: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (bookings.length > 0) return; // already loaded
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/vendor/earnings?batch_id=${batch.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.batch_bookings ?? []);
      }
    } catch { /* ignore */ }
    setLoadingBookings(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Batch summary row */}
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          {/* Mobile layout */}
          <div className="md:hidden space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {fmtPeriod(batch.period_start, batch.period_end)}
              </p>
              {statusBadge(batch.status)}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {batch.booking_count} booking{batch.booking_count !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-gray-900">{fmt(batch.total_with_gst_cents)}</span>
            </div>
            {batch.status === 'paid' && batch.paid_at && (
              <p className="text-xs text-gray-400">
                Paid {fmtDate(batch.paid_at)}
                {batch.payment_method && ` via ${paymentMethodLabel(batch.payment_method)}`}
                {batch.payment_reference && ` · Ref: ${batch.payment_reference}`}
              </p>
            )}
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <p className="text-sm font-medium text-gray-900 w-52 shrink-0">
              {fmtPeriod(batch.period_start, batch.period_end)}
            </p>
            <span className="text-sm text-gray-500 w-24 shrink-0">
              {batch.booking_count} booking{batch.booking_count !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-gray-700 w-24 shrink-0 text-right">{fmt(batch.total_cents)}</span>
            {gstRegistered && (
              <span className="text-sm text-gray-500 w-20 shrink-0 text-right">
                {batch.gst_cents > 0 ? `+${fmt(batch.gst_cents)}` : '—'}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900 w-24 shrink-0 text-right">
              {fmt(batch.total_with_gst_cents)}
            </span>
            <span className="w-28 shrink-0">{statusBadge(batch.status)}</span>
            {batch.status === 'paid' && (
              <span className="text-xs text-gray-400 truncate">
                {fmtDate(batch.paid_at)}
                {batch.payment_method && ` · ${paymentMethodLabel(batch.payment_method)}`}
                {batch.payment_reference && ` · ${batch.payment_reference}`}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>

      {/* Expanded bookings */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {loadingBookings ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No bookings in this batch.</p>
          ) : (
            <div className="space-y-2">
              {/* Desktop column headers */}
              <div className="hidden md:grid md:grid-cols-6 gap-2 text-xs font-medium text-gray-500 px-2 pb-1">
                <span>Service</span>
                <span>Date</span>
                <span>Mode</span>
                <span className="text-right">Client paid</span>
                <span className="text-right">Commission</span>
                <span className="text-right">Your earnings</span>
              </div>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-md bg-white border border-gray-100 px-3 py-2.5"
                >
                  {/* Mobile */}
                  <div className="md:hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{b.service_name}</span>
                      <span className="text-sm font-semibold text-navy">{fmt(b.vendor_total_payout_cents)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{fmtDate(b.appointment_datetime)}</span>
                      {modeBadge(b.delivery_mode)}
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:grid md:grid-cols-6 gap-2 items-center text-sm">
                    <span className="font-medium text-gray-900 truncate">{b.service_name}</span>
                    <span className="text-gray-600">{fmtDate(b.appointment_datetime)}</span>
                    <span>{modeBadge(b.delivery_mode)}</span>
                    <span className="text-right text-gray-600">{fmt(b.total_charged_cents)}</span>
                    <span className="text-right text-red-500">−{fmt(b.platform_fee_cents)}</span>
                    <span className="text-right font-semibold text-navy">{fmt(b.vendor_total_payout_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
