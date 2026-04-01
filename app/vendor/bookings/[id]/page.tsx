'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_name: string;
  appointment_datetime: string | null;
  proposed_datetime: string | null;
  status: string;
  amount_paid: number | null;
  notes: string | null;
  num_documents: number;
  created_at: string;
};

export default function VendorBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Propose time state
  const [showPropose, setShowPropose] = useState(false);
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState('');
  const [proposeReason, setProposeReason] = useState('');

  useEffect(() => {
    fetch(`/api/vendor/bookings`)
      .then((r) => r.json())
      .then((data) => {
        const b = (data ?? []).find((x: Booking) => x.id === id);
        setBooking(b || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleAccept() {
    setActing(true);
    await fetch(`/api/vendor/bookings/${id}/accept`, { method: 'POST' });
    setBooking((prev) => prev ? { ...prev, status: 'confirmed' } : null);
    setActing(false);
  }

  async function handlePropose() {
    if (!proposeDate || !proposeTime) return;
    setActing(true);
    const proposed_datetime = new Date(`${proposeDate}T${proposeTime}:00`).toISOString();
    await fetch(`/api/vendor/bookings/${id}/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_datetime, reason: proposeReason }),
    });
    setBooking((prev) => prev ? { ...prev, status: 'pending_scheduling', proposed_datetime } : null);
    setShowPropose(false);
    setActing(false);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>;
  }

  if (!booking) return <p className="text-gray-500">Booking not found.</p>;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' }) : '—';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.push('/vendor/bookings')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Bookings
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{booking.name}</h1>
          <p className="text-sm text-gray-500">{booking.email} · {booking.phone}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Service</dt><dd className="font-medium text-gray-900">{booking.service_name}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Requested Time</dt><dd className="font-medium text-gray-900">{fmtDate(booking.appointment_datetime)}</dd></div>
          {booking.proposed_datetime && (
            <div className="flex justify-between"><dt className="text-gray-500">Proposed Time</dt><dd className="font-medium text-orange-600">{fmtDate(booking.proposed_datetime)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-gray-500">Documents</dt><dd>{booking.num_documents}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Amount Paid</dt><dd>{booking.amount_paid != null ? `$${(booking.amount_paid / 100).toFixed(2)}` : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Booked</dt><dd>{fmtDate(booking.created_at)}</dd></div>
        </dl>
        {booking.notes && (
          <div className="mt-4 rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Customer Notes</p>
            <p className="mt-1 text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Actions — only for paid bookings */}
      {booking.status === 'paid' && (
        <div className="space-y-3">
          <button onClick={handleAccept} disabled={acting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            <CheckCircle className="h-4 w-4" />
            {acting ? 'Confirming...' : 'Accept — Confirm This Time'}
          </button>
          <button onClick={() => setShowPropose(true)} disabled={acting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-orange-300 px-4 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50">
            <Clock className="h-4 w-4" />
            Propose Different Time
          </button>
        </div>
      )}

      {/* Propose modal */}
      {showPropose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">Propose a New Time</h3>
            <p className="mt-1 text-sm text-gray-500">The customer will be emailed with the option to accept or request a refund.</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" value={proposeTime} onChange={(e) => setProposeTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional, shown to customer)</label>
                <textarea rows={2} value={proposeReason} onChange={(e) => setProposeReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Schedule conflict..." />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPropose(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handlePropose} disabled={acting || !proposeDate || !proposeTime}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {acting ? 'Sending...' : 'Send Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
