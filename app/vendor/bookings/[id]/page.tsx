'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, ClipboardCheck } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import DocumentUpload from '@/components/vendor/DocumentUpload';

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_name: string;
  appointment_datetime: string | null;
  proposed_datetime: string | null;
  status: string;
  vendor_payout_cents: number | null;
  vendor_gst_cents: number | null;
  vendor_total_payout_cents: number | null;
  notes: string | null;
  num_documents: number;
  delivery_mode: string | null;
  customer_address: string | null;
  facility_name: string | null;
  created_at: string;
};

type Doc = {
  id: string;
  type: 'customer_id' | 'commissioned_document';
  file_url: string;
  file_name: string;
  uploaded_at: string;
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

  // Set confirmed time state
  const [showSetTime, setShowSetTime] = useState(false);
  const [setTimeDate, setSetTimeDate] = useState('');
  const [setTimeTime, setSetTimeTime] = useState('');

  // Documents & completion
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  useEffect(() => {
    fetch(`/api/vendor/bookings`)
      .then((r) => r.json())
      .then((data) => {
        const b = (data ?? []).find((x: Booking) => x.id === id);
        setBooking(b || null);
        setLoading(false);
        // Fetch documents if booking is in completable state
        if (b && ['confirmed', 'paid', 'completed'].includes(b.status)) {
          fetch(`/api/vendor/bookings/${id}/documents`)
            .then((r) => r.json())
            .then((d) => setDocuments(d.documents ?? []))
            .catch(() => {});
        }
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

  function openSetTime() {
    const base = booking?.proposed_datetime || booking?.appointment_datetime;
    if (base) {
      const d = new Date(base);
      const pad = (n: number) => String(n).padStart(2, '0');
      setSetTimeDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setSetTimeTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setSetTimeDate('');
      setSetTimeTime('');
    }
    setShowSetTime(true);
  }

  async function handleSetTime() {
    if (!setTimeDate || !setTimeTime) return;
    setActing(true);
    const appointment_datetime = new Date(`${setTimeDate}T${setTimeTime}:00`).toISOString();
    const res = await fetch(`/api/vendor/bookings/${id}/set-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_datetime }),
    });
    if (res.ok) {
      setBooking((prev) => prev ? {
        ...prev,
        status: 'confirmed',
        appointment_datetime,
        proposed_datetime: null,
      } : null);
      setShowSetTime(false);
    }
    setActing(false);
  }

  async function handleComplete() {
    setCompleting(true);
    setCompleteError('');
    const res = await fetch(`/api/vendor/bookings/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: completionNotes }),
    });
    if (res.ok) {
      setBooking((prev) => prev ? { ...prev, status: 'completed' } : null);
    } else {
      const data = await res.json();
      setCompleteError(data.error || 'Failed to complete');
    }
    setCompleting(false);
  }

  const hasCustomerId = documents.some((d) => d.type === 'customer_id');
  const hasCommDoc = documents.some((d) => d.type === 'commissioned_document');
  const canComplete = hasCustomerId && hasCommDoc;

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
          {booking.delivery_mode === 'mobile' && (
            <>
              <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd className="font-medium text-navy">Mobile Service</dd></div>
              {booking.customer_address && <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-right max-w-[200px]">{booking.customer_address}</dd></div>}
              {booking.facility_name && <div className="flex justify-between"><dt className="text-gray-500">Facility</dt><dd>{booking.facility_name}</dd></div>}
            </>
          )}
          <div className="flex justify-between"><dt className="text-gray-500">Service Payout</dt><dd>{booking.vendor_payout_cents != null ? `$${(booking.vendor_payout_cents / 100).toFixed(2)}` : '—'}</dd></div>
          {(booking.vendor_gst_cents ?? 0) > 0 && (
            <div className="flex justify-between"><dt className="text-gray-500">GST (5%)</dt><dd>${((booking.vendor_gst_cents ?? 0) / 100).toFixed(2)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-gray-500 font-medium">Your Payout</dt><dd className="font-medium text-green-700">{booking.vendor_total_payout_cents != null ? `$${(booking.vendor_total_payout_cents / 100).toFixed(2)}` : booking.vendor_payout_cents != null ? `$${(booking.vendor_payout_cents / 100).toFixed(2)}` : '—'}</dd></div>
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[44px]">
            <CheckCircle className="h-4 w-4" />
            {acting ? 'Confirming...' : 'Accept — Confirm This Time'}
          </button>
          <button onClick={() => setShowPropose(true)} disabled={acting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-orange-300 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 min-h-[44px]">
            <Clock className="h-4 w-4" />
            Propose Different Time
          </button>
        </div>
      )}

      {/* Set confirmed time — for paid, pending_scheduling, and confirmed */}
      {['paid', 'pending_scheduling', 'confirmed'].includes(booking.status) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h2 className="font-medium text-gray-900">Set Confirmed Time</h2>
          <p className="text-sm text-gray-600">
            {booking.status === 'pending_scheduling'
              ? 'Already agreed on a time with the customer? Set it here — this retracts the pending proposal and sends a confirmation email.'
              : booking.status === 'confirmed'
              ? 'Reschedule this confirmed booking. A rescheduled confirmation email will be sent to the customer.'
              : 'Confirm at a time you\u2019ve already agreed on with the customer. Sends a confirmation email.'}
          </p>
          <button onClick={openSetTime} disabled={acting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
            <Clock className="h-4 w-4" />
            Set Confirmed Time
          </button>
        </div>
      )}

      {/* Cancellation Request — vendor approve/deny */}
      {booking.status === 'pending_cancellation' && (
        <CancelRequestCard bookingId={booking.id} customerName={booking.name} serviceName={booking.service_name}
          onDecision={(decision) => {
            setBooking((prev) => prev ? { ...prev, status: decision === 'approve' ? 'cancelled' : 'confirmed' } : null);
          }}
        />
      )}

      {/* Complete Appointment — for confirmed bookings */}
      {['confirmed', 'paid'].includes(booking.status) && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-navy" />
            Complete Appointment
          </h2>
          <p className="text-sm text-gray-500">
            Upload the customer&apos;s ID and photos of the commissioned documents, then mark as complete to become eligible for payout.
          </p>

          <DocumentUpload
            bookingId={booking.id}
            documents={documents}
            onDocumentsChange={setDocuments}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Any notes about the appointment..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>

          {completeError && <p className="text-sm text-red-600">{completeError}</p>}

          <button
            type="button"
            onClick={handleComplete}
            disabled={!canComplete || completing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-navy px-4 py-3 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <CheckCircle size={16} />
            {completing ? 'Completing...' : 'Mark as Complete'}
          </button>
          {!canComplete && (
            <p className="text-xs text-amber-600 text-center">
              Upload at least one customer ID and one commissioned document to enable completion.
            </p>
          )}
        </div>
      )}

      {/* Completed — show uploads read-only */}
      {booking.status === 'completed' && documents.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
          <h2 className="text-sm font-medium text-green-800 flex items-center gap-2">
            <CheckCircle size={16} /> Appointment Completed
          </h2>
          <DocumentUpload
            bookingId={booking.id}
            documents={documents}
            onDocumentsChange={setDocuments}
            disabled
          />
        </div>
      )}

      {/* Propose modal */}
      {showPropose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-t-xl sm:rounded-lg bg-white p-5 sm:p-6 shadow-lg mx-0 sm:mx-4">
            <h3 className="text-lg font-medium text-gray-900">Propose a New Time</h3>
            <p className="mt-1 text-sm text-gray-500">The customer will be emailed with the option to accept or request a refund.</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" value={proposeTime} onChange={(e) => setProposeTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional, shown to customer)</label>
                <textarea rows={2} value={proposeReason} onChange={(e) => setProposeReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-base" placeholder="e.g. Schedule conflict..." />
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

      {/* Set confirmed time modal */}
      {showSetTime && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-t-xl sm:rounded-lg bg-white p-5 sm:p-6 shadow-lg mx-0 sm:mx-4">
            <h3 className="text-lg font-medium text-gray-900">Set Confirmed Time</h3>
            <p className="mt-1 text-sm text-gray-500">The booking will be confirmed at this time and a confirmation email will be sent. Any pending proposal will be retracted.</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={setTimeDate} onChange={(e) => setSetTimeDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" value={setTimeTime} onChange={(e) => setSetTimeTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSetTime(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSetTime} disabled={acting || !setTimeDate || !setTimeTime}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {acting ? 'Confirming...' : 'Confirm & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CancelRequestCard({ bookingId, customerName, serviceName, onDecision }: {
  bookingId: string;
  customerName: string;
  serviceName: string;
  onDecision: (decision: 'approve' | 'deny') => void;
}) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  async function handleDecision(decision: 'approve' | 'deny') {
    if (!confirm(decision === 'approve'
      ? 'Approve cancellation and issue a full refund?'
      : 'Deny cancellation? The booking will remain active.'
    )) return;

    setActing(true);
    setError('');
    const res = await fetch(`/api/vendor/bookings/${bookingId}/cancel-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      onDecision(decision);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed');
    }
    setActing(false);
  }

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-5 space-y-3">
      <h2 className="text-base font-semibold text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Cancellation Request
      </h2>
      <p className="text-sm text-amber-700">
        <strong>{customerName}</strong> is requesting to cancel their booking for <strong>{serviceName}</strong>.
        This is within the approval window. You can approve the cancellation with a full refund, or deny it.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecision('approve')}
          disabled={acting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
        >
          {acting ? 'Processing...' : 'Approve & Refund'}
        </button>
        <button
          onClick={() => handleDecision('deny')}
          disabled={acting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
        >
          {acting ? 'Processing...' : 'Deny — Keep Booking'}
        </button>
      </div>
    </div>
  );
}
