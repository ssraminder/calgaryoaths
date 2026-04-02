// Customer-facing booking cancellation page — accessed via cancel_token link in email.
// Three-tier cancellation policy (configurable per vendor):
//   > free_cancel_hours: automatic full refund
//   free_cancel_hours to request_cancel_hours: request sent to vendor for approval
//   < request_cancel_hours: no cancellation allowed
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Phone } from 'lucide-react';
import { trackPhoneClick } from '@/lib/analytics';

type BookingInfo = {
  id: string;
  service_name: string;
  name: string;
  appointment_datetime: string | null;
  amount_paid: number | null;
  status: string;
};

type CancelTier = 'free' | 'request' | 'blocked' | 'pending';

export default function CancelBookingClient() {
  const params = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [cancelTier, setCancelTier] = useState<CancelTier>('free');
  const [hoursUntil, setHoursUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<{ refunded?: boolean; pendingApproval?: boolean; cancelTier?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid cancellation link.');
      setLoading(false);
      return;
    }

    fetch(`/api/booking/cancel?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          if (data.booking) setBooking(data.booking);
        } else {
          setBooking(data.booking);
          setCancelTier(data.cancelTier || (data.canCancelFree ? 'free' : 'blocked'));
          setHoursUntil(data.hoursUntilAppointment);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load booking details.');
        setLoading(false);
      });
  }, [token]);

  async function handleCancel() {
    if (!token) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to cancel booking. Please try again or contact us.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-mid-grey">
        <Loader2 size={20} className="animate-spin" /> Loading booking details...
      </div>
    );
  }

  // Fatal error — no booking found
  if (error && !booking) {
    return (
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-charcoal mb-2">Cannot Cancel</h1>
          <p className="text-mid-grey">{error}</p>
          <Link href="/" className="btn-primary inline-flex mt-6">Back to Calgary Oaths</Link>
        </div>
      </div>
    );
  }

  // Result: cancellation request sent to vendor
  if (result?.pendingApproval) {
    return (
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-card p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-amber-600" />
            </div>
            <h1 className="font-display font-bold text-2xl text-charcoal mb-2">
              Cancellation Request Submitted
            </h1>
            <p className="text-mid-grey leading-relaxed">
              Your cancellation request for <strong>{booking?.service_name}</strong> has been sent to your service provider for review.
              You will receive an email once a decision has been made.
            </p>
            <p className="text-sm text-mid-grey mt-3">
              Your appointment remains active until the request is approved.
            </p>
          </div>

          <ContactFooter />

          <div className="text-center mt-6">
            <Link href="/" className="btn-primary inline-flex">Back to Calgary Oaths</Link>
          </div>
        </div>
      </div>
    );
  }

  // Result: cancellation complete (free tier — refunded)
  if (result) {
    return (
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-2xl mx-auto">
          <div className="bg-teal/10 border border-teal/30 rounded-card p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-teal" />
            </div>
            <h1 className="font-display font-bold text-2xl text-charcoal mb-2">
              Booking Cancelled
            </h1>
            <p className="text-mid-grey leading-relaxed">
              Your booking for <strong>{booking?.service_name}</strong> has been cancelled and a full refund of <strong>${((booking?.amount_paid || 0) / 100).toFixed(2)}</strong> has been initiated.
              Please allow 5–10 business days for the refund to appear on your statement.
            </p>
          </div>

          <ContactFooter />

          <div className="text-center mt-6">
            <Link href="/" className="btn-primary inline-flex">Back to Calgary Oaths</Link>
          </div>
        </div>
      </div>
    );
  }

  // Already pending cancellation
  if (cancelTier === 'pending') {
    return (
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-amber-600" />
          </div>
          <h1 className="font-display font-bold text-2xl text-charcoal mb-2">Cancellation Pending</h1>
          <p className="text-mid-grey">
            Your cancellation request for <strong>{booking?.service_name}</strong> is currently being reviewed.
            You will receive an email once a decision has been made.
          </p>
          <Link href="/" className="btn-primary inline-flex mt-6">Back to Calgary Oaths</Link>
        </div>
      </div>
    );
  }

  // Confirmation screen
  const apptDate = booking?.appointment_datetime
    ? new Date(booking.appointment_datetime).toLocaleString('en-CA', {
        timeZone: 'America/Edmonton',
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : 'Not scheduled';

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-2xl mx-auto">
        <div className="bg-white border border-border rounded-card p-8 mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h1 className="font-display font-bold text-2xl text-charcoal mb-2">Cancel Your Booking?</h1>
            <p className="text-mid-grey">Please review the details below before confirming.</p>
          </div>

          {/* Booking details */}
          <div className="bg-bg rounded-card p-5 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-mid-grey">Service</span>
              <span className="font-medium text-charcoal">{booking?.service_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mid-grey">Customer</span>
              <span className="font-medium text-charcoal">{booking?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mid-grey">Appointment</span>
              <span className="font-medium text-charcoal">{apptDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mid-grey">Amount Paid</span>
              <span className="font-medium text-charcoal">${((booking?.amount_paid || 0) / 100).toFixed(2)} CAD</span>
            </div>
          </div>

          {/* Cancellation policy notice */}
          {cancelTier === 'free' && (
            <div className="bg-teal/10 border border-teal/30 rounded-card p-4 mb-6">
              <p className="text-sm text-charcoal">
                <strong>Free cancellation available.</strong> You will receive a full refund of <strong>${((booking?.amount_paid || 0) / 100).toFixed(2)}</strong>.
              </p>
            </div>
          )}

          {cancelTier === 'request' && (
            <div className="bg-amber-50 border border-amber-200 rounded-card p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Cancellation requires approval.</strong> Your appointment is{' '}
                {hoursUntil !== null ? `${hoursUntil} hours` : 'less than the free cancellation window'} away.
                Your cancellation request will be sent to the service provider for review. If approved, you will receive a full refund.
              </p>
            </div>
          )}

          {cancelTier === 'blocked' && (
            <div className="bg-red-50 border border-red-200 rounded-card p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Cancellation is no longer available.</strong> Your appointment is{' '}
                {hoursUntil !== null ? `${hoursUntil} hours` : 'very close'} away.
                Please attend your appointment as scheduled. Missing your appointment will be treated as a no-show.
              </p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {cancelTier !== 'blocked' ? (
            <div className="flex gap-3">
              <Link href="/" className="btn-primary flex-1 justify-center !bg-border !text-charcoal hover:!bg-gray-300">
                Keep My Booking
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-primary flex-1 justify-center !bg-red-600 hover:!bg-red-700 disabled:opacity-50"
              >
                {cancelling
                  ? 'Submitting...'
                  : cancelTier === 'free'
                    ? 'Cancel & Refund'
                    : 'Request Cancellation'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link href="/" className="btn-primary flex-1 justify-center">
                Keep My Booking
              </Link>
            </div>
          )}
        </div>

        <ContactFooter label="Need to reschedule instead?" />
      </div>
    </div>
  );
}

function ContactFooter({ label = 'Questions?' }: { label?: string }) {
  return (
    <div className="text-center text-sm text-mid-grey">
      <p>
        {label}{' '}
        <a href="tel:5876000746" onClick={() => trackPhoneClick('cancel_page')} className="text-gold hover:underline inline-flex items-center gap-1">
          <Phone size={13} />
          (587) 600-0746
        </a>
        {' '}or{' '}
        <a href="mailto:info@calgaryoaths.com" className="text-gold hover:underline">
          info@calgaryoaths.com
        </a>
      </p>
    </div>
  );
}
