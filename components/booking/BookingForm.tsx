'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { bookingServices, type BookingService } from '@/lib/data/booking';
import { commissioners } from '@/lib/data/commissioners';

/* ── Validation schema ─────────────────────────────────────────────────── */
const detailsSchema = z.object({
  name: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  commissionerId: z.string().min(1, 'Please choose a location'),
  numDocuments: z.coerce.number().int().min(1).max(20),
  notes: z.string().max(500).optional(),
});
type DetailsForm = z.infer<typeof detailsSchema>;

/* ── Step indicator ─────────────────────────────────────────────────────── */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s <= step ? 'bg-gold w-8' : 'bg-border w-4'
          }`}
        />
      ))}
      <span className="text-xs text-mid-grey ml-2">Step {step} of 2</span>
    </div>
  );
}

/* ── Service card ───────────────────────────────────────────────────────── */
function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: BookingService;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-card border-2 transition-all duration-150 ${
        selected
          ? 'border-gold bg-gold/5'
          : 'border-border hover:border-gold/50 hover:bg-bg'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-charcoal text-sm leading-snug">{service.name}</p>
          <p className="text-xs text-mid-grey mt-0.5 leading-relaxed">{service.shortDescription}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-semibold text-gold">{service.priceLabel}</span>
          {service.requiresReview ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-pill font-medium whitespace-nowrap">
              Manual review
            </span>
          ) : (
            <span className="text-[10px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-pill font-medium whitespace-nowrap">
              Book instantly
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function BookingForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false); // for manual-review services
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { numDocuments: 1 },
  });

  const numDocuments = watch('numDocuments') || 1;

  /* ── Computed price label ─── */
  const pricePreview =
    selectedService?.price
      ? `$${((selectedService.price * numDocuments) / 100).toFixed(0)}`
      : selectedService?.priceLabel ?? '';

  /* ── Submit ─────────────────────────────────────────────────────────── */
  async function onSubmit(data: DetailsForm) {
    if (!selectedService) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: selectedService.slug,
          commissionerId: data.commissionerId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          notes: data.notes || '',
          numDocuments: data.numDocuments,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.');
        return;
      }

      if (json.requiresReview) {
        // Manual review — show confirmation screen
        setSubmitted(true);
      } else if (json.checkoutUrl) {
        // Auto-confirm — redirect to Stripe Checkout
        window.location.href = json.checkoutUrl;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Manual review confirmed screen ──────────────────────────────────── */
  if (submitted) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-teal" />
        </div>
        <h3 className="font-display font-bold text-xl text-charcoal">Request received!</h3>
        <p className="text-mid-grey text-sm leading-relaxed max-w-xs mx-auto">
          We'll review your request and contact you within 2 hours to confirm your appointment and process payment.
        </p>
        <div className="flex items-center gap-2 justify-center text-xs text-mid-grey pt-2">
          <Clock size={13} />
          <span>Mon–Fri 9 AM – 9 PM · Sat 10 AM – 5 PM</span>
        </div>
        <button
          onClick={onClose}
          className="btn-primary mx-auto mt-2"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Step 1: Service selection ──────────────────────────────────── */}
      {step === 1 && (
        <div className="p-6">
          <StepDots step={1} />
          <h3 className="font-display font-semibold text-lg text-charcoal mb-1">
            What service do you need?
          </h3>
          <p className="text-mid-grey text-sm mb-4">Select the service you're booking today.</p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {bookingServices.map((s) => (
              <ServiceCard
                key={s.slug}
                service={s}
                selected={selectedService?.slug === s.slug}
                onSelect={() => setSelectedService(s)}
              />
            ))}
          </div>

          {selectedService?.requiresReview && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-card p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <p>{selectedService.reviewReason}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedService}
            onClick={() => setStep(2)}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 2: Details ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="p-6">
          <StepDots step={2} />

          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-mid-grey hover:text-charcoal transition-colors"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">
                Your details
              </h3>
              <p className="text-xs text-mid-grey">{selectedService?.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Full name *</label>
              <input
                {...register('name')}
                type="text"
                placeholder="Jane Smith"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${
                  errors.name ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="jane@example.com"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${
                  errors.email ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="(403) 555-0123"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${
                  errors.phone ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Commissioner / Location */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Preferred location *</label>
              <select
                {...register('commissionerId')}
                className={`w-full border rounded-btn px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${
                  errors.commissionerId ? 'border-red-400' : 'border-border'
                }`}
              >
                <option value="">Select a location…</option>
                {commissioners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.location}
                  </option>
                ))}
              </select>
              {errors.commissionerId && (
                <p className="text-red-500 text-xs mt-1">{errors.commissionerId.message}</p>
              )}
            </div>

            {/* Number of documents */}
            {selectedService && !selectedService.requiresReview && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Number of documents
                </label>
                <input
                  {...register('numDocuments')}
                  type="number"
                  min={1}
                  max={20}
                  className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition"
                />
                {selectedService.price && (
                  <p className="text-xs text-mid-grey mt-1">
                    Estimated total:{' '}
                    <span className="font-semibold text-charcoal">{pricePreview}</span>
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Notes <span className="text-mid-grey font-normal">(optional)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Any details we should know — urgency, document type, language preference…"
                className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition resize-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-card p-3 text-xs text-red-700">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing…
                </>
              ) : selectedService?.requiresReview ? (
                'Submit request'
              ) : (
                <>Proceed to payment — {pricePreview}</>
              )}
            </button>

            {!selectedService?.requiresReview && (
              <p className="text-center text-xs text-mid-grey">
                Secure payment via Stripe. You will be redirected to complete payment.
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
