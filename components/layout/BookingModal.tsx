'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBookingModal } from '@/lib/context/BookingModalContext';
import BookingForm from '@/components/booking/BookingForm';

export default function BookingModal() {
  const { isOpen, closeModal } = useBookingModal();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-charcoal/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-card shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="font-display text-xl font-bold text-navy">
            Book an appointment
          </h2>
          <button
            onClick={closeModal}
            className="text-mid-grey hover:text-charcoal transition-colors p-2 rounded-btn hover:bg-bg"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <BookingForm onClose={closeModal} />
      </div>
    </div>
  );
}
