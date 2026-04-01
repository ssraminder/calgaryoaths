'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

type ReviewBooking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_name: string;
  service_slug: string;
  commissioner_id: string;
  notes: string | null;
  num_documents: number;
  created_at: string;
  requires_review: boolean;
};

export default function ReviewsPage() {
  const [bookings, setBookings] = useState<ReviewBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    const res = await fetch('/api/admin/bookings?status=pending_review&page=1');
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleAction() {
    if (!actionBookingId || !actionType) return;
    setSubmitting(true);

    await fetch(`/api/admin/reviews/${actionBookingId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionType, reason }),
    });

    setActionBookingId(null);
    setActionType('');
    setReason('');
    setSubmitting(false);
    fetchReviews();
  }

  function openAction(bookingId: string, type: string) {
    setActionBookingId(bookingId);
    setActionType(type);
    setReason('');
  }

  function timeSince(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Manual Review Queue</h1>
        <span className="text-sm text-gray-500">{bookings.length} pending</span>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <p className="mt-3 text-gray-500">All caught up! No bookings pending review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{b.name}</h3>
                  <p className="text-sm text-gray-500">
                    {b.email} {b.phone ? `· ${b.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  {timeSince(b.created_at)}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Service: </span>
                  <span className="font-medium text-gray-700">{b.service_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Commissioner: </span>
                  <span className="font-medium text-gray-700">{b.commissioner_id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documents: </span>
                  <span className="font-medium text-gray-700">{b.num_documents}</span>
                </div>
              </div>

              {b.notes && (
                <div className="mt-3 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Customer Notes</p>
                  <p className="mt-1 text-sm text-gray-700">{b.notes}</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openAction(b.id, 'approved')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => openAction(b.id, 'rejected')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => openAction(b.id, 'info_requested')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Request Info
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {actionBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900">
              {actionType === 'approved' && 'Approve Booking'}
              {actionType === 'rejected' && 'Reject Booking'}
              {actionType === 'info_requested' && 'Request Information'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {actionType === 'approved' && 'The customer will be emailed that their booking is approved and they can proceed to scheduling.'}
              {actionType === 'rejected' && 'The customer will be emailed that their booking has been declined.'}
              {actionType === 'info_requested' && 'The customer will be emailed asking for additional information.'}
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder={
                actionType === 'rejected'
                  ? 'Reason for rejection (included in email)...'
                  : actionType === 'info_requested'
                  ? 'What information do you need? (included in email)...'
                  : 'Optional note (internal only)...'
              }
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setActionBookingId(null); setActionType(''); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  actionType === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:bg-navy/90'
                }`}
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
