'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Phone } from 'lucide-react';
import { trackBookingConversion, trackPhoneClick } from '@/lib/analytics';

export default function BookingConfirmedPage() {
  useEffect(() => {
    trackBookingConversion();
  }, []);

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-2xl mx-auto">
        {/* Success banner */}
        <div className="bg-teal/10 border border-teal/30 rounded-card p-8 text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-teal" />
          </div>
          <h1 className="font-display font-bold text-2xl text-charcoal mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-mid-grey leading-relaxed">
            Your appointment has been successfully booked. You will receive a
            confirmation email with all the details.
          </p>
        </div>

        {/* What to bring */}
        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-lg text-charcoal">
            What to bring to your appointment
          </h2>
          <ol className="space-y-3 text-sm text-charcoal">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span>
                A valid <strong>government-issued photo ID</strong> (driver&apos;s
                licence, passport, or provincial ID).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>
                Your documents — please bring them <strong>unsigned</strong>. You
                will sign in front of the commissioner.
              </span>
            </li>
          </ol>
        </div>

        {/* Help */}
        <div className="text-center text-sm text-mid-grey mt-8">
          <p>
            Questions?{' '}
            <a
              href="tel:5876000746"
              onClick={() => trackPhoneClick('booking_confirmed')}
              className="text-gold hover:underline inline-flex items-center gap-1"
            >
              <Phone size={13} />
              (587) 600-0746
            </a>
            {' '}or{' '}
            <a
              href="mailto:info@calgaryoaths.com"
              className="text-gold hover:underline"
            >
              info@calgaryoaths.com
            </a>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="btn-primary inline-flex">
            Back to Calgary Oaths
          </Link>
        </div>
      </div>
    </div>
  );
}
