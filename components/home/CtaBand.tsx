'use client';

import BookButton from '@/components/shared/BookButton';
import { Phone } from 'lucide-react';
import { trackPhoneClick } from '@/lib/analytics';

export default function CtaBand() {
  return (
    <section className="bg-navy py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 grid-texture" aria-hidden="true" />
      <div className="relative max-content text-center">
        <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
          Ready to get your documents commissioned?
        </h2>
        <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
          Same-day service at both Calgary locations. Book online or call us now.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <BookButton label="Book Your Appointment" variant="primary" size="lg" />
          <a
            href="tel:5876000746"
            onClick={() => trackPhoneClick('cta_band')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-btn border-2 border-white/60 text-white font-medium text-base uppercase tracking-wide hover:bg-white/10 transition-colors duration-200"
          >
            <Phone size={18} />
            Call Us
          </a>
        </div>
      </div>
    </section>
  );
}
