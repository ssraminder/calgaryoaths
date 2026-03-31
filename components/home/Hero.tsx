'use client';

import BookButton from '@/components/shared/BookButton';
import { Phone } from 'lucide-react';

type HeroProps = {
  locationCount?: number;
  commissionerCount?: number;
  startingPrice?: number;
};

export default function Hero({ locationCount = 2, commissionerCount = 2, startingPrice = 30 }: HeroProps) {
  const locationWord = locationCount === 1 ? 'location' : 'locations';
  const commissionerWord = commissionerCount === 1 ? 'commissioner' : 'commissioners';

  return (
    <section className="relative bg-navy overflow-hidden">
      {/* Grid texture overlay */}
      <div className="absolute inset-0 grid-texture" aria-hidden="true" />

      {/* Subtle gold gradient accent */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-3xl"
        aria-hidden="true"
      />

      <div className="relative max-content py-20 lg:py-28 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-pill px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-white/80 text-xs font-medium uppercase tracking-wide">
            {locationCount} Location{locationCount !== 1 ? 's' : ''} · Same-Day Service Available
          </span>
        </div>

        <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-white leading-tight max-w-3xl mx-auto">
          {"Calgary's Commissioner of Oaths and Notary —"}
          <br />
          <span className="text-gold">Fast, Certified & Same-Day</span>
        </h1>

        <p className="mt-6 text-white/75 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          {locationCount} {locationWord} across Calgary. {commissionerCount} {commissionerWord} ready to help.
          Affidavits, declarations, travel consent letters, and more —{' '}
          <span className="text-white font-medium">from ${startingPrice}.</span>
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <BookButton
            label="Book Your Appointment"
            variant="primary"
            size="lg"
          />
          <a
            href="tel:5876000746"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-btn border-2 border-white/60 text-white font-medium text-base uppercase tracking-wide hover:bg-white/10 transition-colors duration-200"
          >
            <Phone size={18} />
            Call (587) 600-0746
          </a>
        </div>

        {/* Trust micro-copy */}
        <p className="mt-6 text-white/50 text-sm">
          Same-day available · From ${startingPrice} · Walk-ins welcome · Downtown & NE Calgary
        </p>
      </div>
    </section>
  );
}
