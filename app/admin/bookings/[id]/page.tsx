'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_slug: string;
  service_name: string;
  commissioner_id: string;
  appointment_datetime: string | null;
  proposed_datetime: string | null;
  status: string;
  amount_paid: number | null;
  notes: string | null;
  admin_notes: string | null;
  num_documents: number;
  requires_review: boolean;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

const VALID_STATUSES = [
  'pending', 'pending_review', 'pending_scheduling', 'pending_payment',
  'paid', 'confirmed', 'cancelled', 'no_show', 'completed', 'rejected',
];

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Propose modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeDate, setProposeDate] = useState('');
  const [proposeTime, setProposeTime] = useState('');
  const [proposeReason, setProposeReason] = useState('');

  // Set confirmed time modal
  const [showSetTimeModal, setShowSetTimeModal] = useState(false);
  const [setTimeDate, setSetTimeDate] = useState('');
  const [setTimeTime, setSetTimeTime] = useState('');

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRefund, setCancelRefund] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setBooking(data);
          setAdminNotes(data.admin_notes || '');
          setNewStatus(data.status);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (newStatus !== booking?.status) body.status = newStatus;
    if (adminNotes !== (booking?.admin_notes || '')) body.admin_notes = adminNotes;

    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    if (updated.id) {
      setBooking(updated);
      setNewStatus(updated.status);
      setAdminNotes(updated.admin_notes || '');
    }
    setSaving(false);
  }

  async function handleCancel() {
    setSaving(true);
    const res = await fetch(`/api/admin/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason, refund: cancelRefund }),
    });
    if (res.ok) {
      // Refresh
      const data = await fetch(`/api/admin/bookings/${id}`).then((r) => r.json());
      setBooking(data);
      setNewStatus(data.status);
      setShowCancel(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return <p className="text-gray-500">Booking not found.</p>;
  }

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleString('en-CA', {
          timeZone: 'America/Edmonton',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/admin/bookings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{booking.name}</h1>
          <p className="text-sm text-gray-500">{booking.id}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer & Booking Info */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-medium text-gray-900">Booking Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={booking.email} />
            <Row label="Phone" value={booking.phone || '—'} />
            <Row label="Service" value={booking.service_name} />
            <Row label="Commissioner" value={booking.commissioner_id} />
            <Row label="Appointment" value={fmtDate(booking.appointment_datetime)} />
            <Row label="Documents" value={String(booking.num_documents)} />
            <Row label="Requires Review" value={booking.requires_review ? 'Yes' : 'No'} />
            <Row label="Created" value={fmtDate(booking.created_at)} />
            <Row label="Updated" value={fmtDate(booking.updated_at)} />
            {booking.amount_paid != null && (
              <Row label="Amount Paid" value={`$${(booking.amount_paid / 100).toFixed(2)}`} />
            )}
            {booking.stripe_payment_intent_id && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Stripe</dt>
                <dd>
                  <a
                    href={`https://dashboard.stripe.com/payments/${booking.stripe_payment_intent_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy hover:underline"
                  >
                    {booking.stripe_payment_intent_id.slice(0, 20)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
            {booking.cancelled_at && (
              <>
                <Row label="Cancelled At" value={fmtDate(booking.cancelled_at)} />
                <Row label="Cancel Reason" value={booking.cancelled_reason || '—'} />
              </>
            )}
          </dl>

          {booking.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500">Customer Notes</p>
              <p className="mt-1 text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Accept / Propose — for paid bookings */}
          {booking.status === 'paid' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
              <h2 className="font-medium text-gray-900">Confirm Booking</h2>
              <p className="text-sm text-gray-600">This booking is paid. Accept the requested time or propose a different one.</p>
              <button
                onClick={async () => { setSaving(true); await fetch(`/api/admin/bookings/${id}/accept`, { method: 'POST' }); const d = await fetch(`/api/admin/bookings/${id}`).then(r => r.json()); setBooking(d); setNewStatus(d.status); setSaving(false); }}
                disabled={saving}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Accept — Confirm This Time
              </button>
              <button
                onClick={() => setShowProposeModal(true)}
                disabled={saving}
                className="w-full rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                Propose Different Time
              </button>
            </div>
          )}

          {/* Set confirmed time — for paid, pending_scheduling, and confirmed */}
          {['paid', 'pending_scheduling', 'confirmed'].includes(booking.status) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 space-y-3">
              <h2 className="font-medium text-gray-900">Set Confirmed Time</h2>
              <p className="text-sm text-gray-600">
                {booking.status === 'pending_scheduling'
                  ? 'Replace the pending proposal with a time you and the customer have already agreed on. This retracts the outstanding proposal and confirms the booking immediately.'
                  : booking.status === 'confirmed'
                  ? 'Reschedule this confirmed booking to a new time. A rescheduled confirmation email will be sent.'
                  : 'Confirm the booking at a time you and the customer have already agreed on. A confirmation email will be sent.'}
              </p>
              <button
                onClick={() => {
                  const base = booking.proposed_datetime || booking.appointment_datetime;
                  if (base) {
                    const d = new Date(base);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    setSetTimeDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                    setSetTimeTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
                  } else {
                    setSetTimeDate('');
                    setSetTimeTime('');
                  }
                  setShowSetTimeModal(true);
                }}
                disabled={saving}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Set Confirmed Time
              </button>
            </div>
          )}

          {/* Status change */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-gray-900">Update Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Admin notes */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-gray-900">Internal Notes</h2>
            <textarea
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="Add internal notes..."
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Cancel booking */}
          {booking.status !== 'cancelled' && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">Cancel Booking</h3>
            <div className="mt-4 space-y-3">
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Reason for cancellation..."
              />
              {booking.stripe_payment_intent_id && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cancelRefund}
                    onChange={(e) => setCancelRefund(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Issue Stripe refund
                </label>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCancel(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose time modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">Propose a New Time</h3>
            <p className="mt-1 text-sm text-gray-500">The customer will be emailed with the option to accept or request a refund.</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" value={proposeTime} onChange={(e) => setProposeTime(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <textarea rows={2} value={proposeReason} onChange={(e) => setProposeReason(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Reason (optional, shown to customer)..." />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowProposeModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                disabled={saving || !proposeDate || !proposeTime}
                onClick={async () => {
                  setSaving(true);
                  await fetch(`/api/admin/bookings/${id}/propose`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proposed_datetime: new Date(`${proposeDate}T${proposeTime}:00`).toISOString(), reason: proposeReason }),
                  });
                  const d = await fetch(`/api/admin/bookings/${id}`).then(r => r.json());
                  setBooking(d); setNewStatus(d.status); setShowProposeModal(false); setSaving(false);
                }}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Sending...' : 'Send Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set confirmed time modal */}
      {showSetTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">Set Confirmed Time</h3>
            <p className="mt-1 text-sm text-gray-500">
              The booking will be confirmed at this time and a confirmation email will be sent to the customer. Any pending proposal will be retracted.
            </p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={setTimeDate} onChange={(e) => setSetTimeDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" value={setTimeTime} onChange={(e) => setSetTimeTime(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSetTimeModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                disabled={saving || !setTimeDate || !setTimeTime}
                onClick={async () => {
                  setSaving(true);
                  const res = await fetch(`/api/admin/bookings/${id}/set-time`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointment_datetime: new Date(`${setTimeDate}T${setTimeTime}:00`).toISOString() }),
                  });
                  if (res.ok) {
                    const d = await fetch(`/api/admin/bookings/${id}`).then(r => r.json());
                    setBooking(d); setNewStatus(d.status); setShowSetTimeModal(false);
                  }
                  setSaving(false);
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Confirming...' : 'Confirm & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
