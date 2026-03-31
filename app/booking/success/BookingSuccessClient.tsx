'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, Phone } from 'lucide-react';
import { commissioners } from '@/lib/data/commissioners';

const CALENDLY_URLS: Record<string, string> = Object.fromEntries(
  commissioners.map((c) => [c.id, c.calendlyUrl])
);
const DEFAULT_CALENDLY = commissioners[0].calendlyUrl;

export default function BookingSuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const commissionerId = params.get('commissioner') || '';
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);

  const calendlyUrl = CALENDLY_URLS[commissionerId] || DEFAULT_CALENDLY;

  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = () => setCalendlyLoaded(true);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  if (!sessionId) {
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
      <div className="max-content max-w-3xl">
        {/* Success banner */}
        <div className="bg-teal/10 border border-teal/30 rounded-card p-6 flex items-start gap-4 mb-10">
          <CheckCircle size={28} className="text-teal flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="font-display font-bold text-2xl text-charcoal">Payment confirmed!</h1>
            <p className="text-mid-grey mt-1">
              Your payment was successful. Now pick a date and time for your appointment below.
              A confirmation email will be sent once you schedule.
            </p>
          </div>
        </div>

        {/* Calendly inline embed */}
        <div className="bg-white rounded-card shadow-card overflow-hidden mb-8">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Calendar size={18} className="text-gold" />
            <h2 className="font-display font-semibold text-charcoal">Schedule your appointment</h2>
          </div>
          <div
            className="calendly-inline-widget"
            data-url={`${calendlyUrl}?hide_gdpr_banner=1&primary_color=B8962E`}
            style={{ minWidth: '320px', height: '700px' }}
          />
          {!calendlyLoaded && (
            <div className="flex items-center justify-center h-40 text-mid-grey text-sm">
              Loading calendar…
            </div>
          )}
        </div>

        {/* Help */}
        <div className="text-center text-sm text-mid-grey">
          <p>
            Need help?{' '}
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
      </div>
    </div>
  );
}
