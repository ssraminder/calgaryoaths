'use client';

import { useEffect, useRef } from 'react';
import { X, MapPin, Clock, Globe } from 'lucide-react';
import { useBookingModal } from '@/lib/context/BookingModalContext';
import { commissioners } from '@/lib/data/commissioners';

export default function BookingModal() {
  const { isOpen, closeModal } = useBookingModal();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handleBook = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-card shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 id="modal-title" className="font-display text-2xl font-bold text-navy">
              Book an appointment
            </h2>
            <p className="text-mid-grey text-sm mt-1">Choose your preferred commissioner and location</p>
          </div>
          <button
            onClick={closeModal}
            className="text-mid-grey hover:text-charcoal transition-colors p-2 rounded-btn hover:bg-bg"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Commissioner cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {commissioners.map((c) => (
            <div
              key={c.id}
              className="border border-border rounded-card p-5 hover:border-gold hover:shadow-card transition-all duration-200 flex flex-col"
            >
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-display font-bold text-lg">
                    {c.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-display font-semibold text-charcoal">{c.name}</p>
                  <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-pill font-medium">
                    {c.credentials[0]}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-mid-grey mb-4 flex-1">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gold mt-0.5 flex-shrink-0" />
                  <span>{c.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gold flex-shrink-0" />
                  <span>Mon–Fri {c.hours.weekdays} · Sat {c.hours.saturday}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-gold flex-shrink-0" />
                  <span>{c.languages.join(', ')}</span>
                </div>
              </div>

              <button
                onClick={() => handleBook(c.calendlyUrl)}
                className="btn-primary w-full justify-center"
              >
                Book with {c.name.split(' ')[0]} →
              </button>
            </div>
          ))}
        </div>

        {/* Mobile service link */}
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-mid-grey">
            Need us to come to you?{' '}
            <a
              href="/contact?service=mobile"
              onClick={closeModal}
              className="text-gold hover:underline underline-offset-4 font-medium"
            >
              Request mobile service →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
