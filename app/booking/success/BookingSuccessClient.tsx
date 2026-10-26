// Booking success page — shown after Stripe payment completes.
// Displays pending commissioner review notice, next steps, and cancellation info.
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { trackBookingConversion, trackPhoneClick } from '@/lib/analytics';

type BookingSummary = {
  serviceName: string | null;
  appointmentDatetime: string | null;
  deliveryMode: string | null;
  locationName: string | null;
  locationAddress: string | null;
  commissionerName: string | null;
};

export default function BookingSuccessClient() {
  const params = useSearchParams();
  const confirmed = params.get('appointment') === 'confirmed';
  const bookingId = params.get('booking');
  const [summary, setSummary] = useState<BookingSummary | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/booking/summary?id=${encodeURIComponent(bookingId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSummary(d))
      .catch(() => {});
  }, [bookingId]);

  useEffect(() => {
    if (confirmed) {
      trackBookingConversion();
    }
  }, [confirmed]);

  if (!confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-mid-grey">Invalid booking link.</p>
          <Link href="/" className="text-gold hover:underline mt-2 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-2xl mx-auto">
        {/* Success banner */}
        <div className="bg-teal/10 border border-teal/30 rounded-card p-8 text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-teal" />
          </div>
          <h1 className="font-display font-bold text-2xl text-charcoal mb-2">Booking Received!</h1>
          <p className="text-mid-grey leading-relaxed">
            Your payment was successful and your appointment request has been submitted.
          </p>
        </div>

        {/* Appointment details */}
        {summary && <AppointmentCard summary={summary} />}

        {/* Commissioner review notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-charcoal text-sm mb-1">Pending Commissioner Review</p>
              <p className="text-sm text-charcoal/70 leading-relaxed">
                Your commissioner will review your request and respond shortly with a confirmation. <strong>This appointment is not final unless it is confirmed by the commissioner.</strong> You will receive a confirmation email once your appointment is confirmed.
              </p>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-lg text-charcoal">What happens next?</h2>
          <ol className="space-y-3 text-sm text-charcoal">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">1</span>
              <span>Your commissioner will review and confirm your appointment time. You&apos;ll receive a confirmation email with final details.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">2</span>
              <span>If the time doesn&apos;t work, they&apos;ll propose an alternative. You can accept the new time, choose another vendor, or request a refund.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">3</span>
              <span>Bring your <strong>government-issued photo ID</strong> and your documents <strong>unsigned</strong> to your appointment.</span>
            </li>
          </ol>
        </div>

        {/* Cancellation info */}
        <div className="card mt-4 bg-bg">
          <p className="text-xs text-mid-grey leading-relaxed">
            Need to cancel? You can cancel your booking from the confirmation email. Cancellations made more than 12 hours before the appointment are eligible for a full refund.
            By booking, you agree to our <a href="/terms-and-conditions" className="text-gold hover:underline">Terms & Conditions</a>.
          </p>
        </div>

        {/* Help */}
        <div className="text-center text-sm text-mid-grey mt-8">
          <p>
            Questions?{' '}
            <a href="tel:5876000746" onClick={() => trackPhoneClick('booking_success')} className="text-gold hover:underline inline-flex items-center gap-1">
              <Phone size={13} />
              (587) 600-0746
            </a>
            {' '}or{' '}
            <a href="mailto:info@calgaryoaths.com" className="text-gold hover:underline">
              info@calgaryoaths.com
            </a>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="btn-primary inline-flex">Back to Calgary Oaths</Link>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ summary }: { summary: BookingSummary }) {
  const when = summary.appointmentDatetime
    ? new Date(summary.appointmentDatetime).toLocaleString('en-CA', {
        timeZone: 'America/Edmonton',
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : null;
  const isMobile = summary.deliveryMode === 'mobile';
  const isVirtual = summary.deliveryMode === 'virtual';

  return (
    <div className="card mb-8 space-y-4" data-testid="appointment-summary">
      <h2 className="font-display font-semibold text-lg text-charcoal">Your appointment</h2>
      {summary.serviceName && (
        <p className="text-sm text-charcoal">
          <strong>{summary.serviceName}</strong>
          {summary.commissionerName && <> with {summary.commissionerName}</>}
        </p>
      )}
      {when && (
        <div className="flex items-start gap-3 text-sm text-charcoal">
          <Calendar size={18} className="mt-0.5 flex-shrink-0 text-gold" />
          <span>{when} <span className="text-mid-grey">(requested)</span></span>
        </div>
      )}
      <div className="flex items-start gap-3 text-sm text-charcoal">
        <MapPin size={18} className="mt-0.5 flex-shrink-0 text-gold" />
        {isMobile ? (
          <span>Mobile service — your commissioner will come to the address you provided.</span>
        ) : isVirtual ? (
          <span>Virtual appointment — you&apos;ll receive video call details by email.</span>
        ) : summary.locationAddress ? (
          <div>
            {summary.locationName && <p className="font-medium">{summary.locationName}</p>}
            <p>{summary.locationAddress}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summary.locationAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-gold hover:underline"
            >
              Get directions <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <span>The address will be included in your confirmation email.</span>
        )}
      </div>
    </div>
  );
}
