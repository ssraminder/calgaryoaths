'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Phone } from 'lucide-react';

export default function BookingSuccessClient() {
  const params = useSearchParams();
  const confirmed = params.get('appointment') === 'confirmed';

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
            Your commissioner will confirm the time shortly.
          </p>
        </div>

        {/* What happens next */}
        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-lg text-charcoal">What happens next?</h2>
          <ol className="space-y-3 text-sm text-charcoal">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">1</span>
              <span>Your commissioner will review and confirm your appointment time. You'll receive a confirmation email.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">2</span>
              <span>If the time doesn't work, they'll propose an alternative. You can accept the new time, choose another vendor, or request a refund.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">3</span>
              <span>Bring your <strong>government-issued photo ID</strong> and your documents <strong>unsigned</strong> to your appointment.</span>
            </li>
          </ol>
        </div>

        {/* Help */}
        <div className="text-center text-sm text-mid-grey mt-8">
          <p>
            Questions?{' '}
            <a href="tel:5876000746" className="text-gold hover:underline inline-flex items-center gap-1">
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
