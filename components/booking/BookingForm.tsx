'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle, Loader2, Calendar, Search } from 'lucide-react';
import { BOOKING_FEES, type BookingService } from '@/lib/data/booking';
import SlotPicker from '@/components/booking/SlotPicker';
import { trackServiceSelected, trackBookingCreated, trackSlotConfirmed, trackConversion } from '@/lib/analytics';

/* ── Validation ─────────────────────────────────────────────────────────── */
const detailsSchema = z.object({
  name: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  commissionerId: z.string().min(1, 'Please choose a location'),
  notes: z.string().max(500).optional(),
});
type DetailsForm = z.infer<typeof detailsSchema>;

/* ── Step dots ──────────────────────────────────────────────────────────── */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 <= step ? 'bg-gold w-8' : 'bg-border w-4'
          }`}
        />
      ))}
      <span className="text-xs text-mid-grey ml-2">Step {step} of {total}</span>
    </div>
  );
}

/* ── Searchable service dropdown ───────────────────────────────────────── */
function ServiceSearch({ services, selected, onSelect }: {
  services: BookingService[];
  selected: BookingService | null;
  onSelect: (s: BookingService) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query
    ? services.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.shortDescription.toLowerCase().includes(query.toLowerCase()))
    : services;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3.5 text-mid-grey pointer-events-none" />
        <input
          type="text"
          placeholder={selected ? selected.name : 'Search services…'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`w-full pl-9 pr-4 py-3 border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${
            selected ? 'border-gold bg-gold/5' : 'border-border bg-white'
          }`}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-[40vh] overflow-y-auto rounded-card border border-border bg-white shadow-card">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-mid-grey">No services found</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => { onSelect(s); setQuery(''); setOpen(false); }}
                className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-bg transition-colors ${
                  selected?.slug === s.slug ? 'bg-gold/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal text-sm leading-snug">{s.name}</p>
                    <p className="text-xs text-mid-grey mt-0.5 leading-relaxed">{s.shortDescription}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-semibold text-gold">{s.priceLabel}</span>
                    {s.requiresReview ? (
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
            ))
          )}
        </div>
      )}
    </div>
  );
}


type DbCommissioner = {
  id: string;
  name: string;
  location: string;
  address?: string;
  booking_fee_cents?: number;
  languages?: string[];
  areas_served?: string[];
  soonestSlot?: string | null;
  first_page_cents?: number | null;
  additional_page_cents?: number | null;
  drafting_fee_cents?: number | null;
  mobile_available?: boolean;
  mobile_travel_fee_cents?: number | null;
  virtual_available?: boolean;
};

/* ── Sort commissioners ────────────────────────────────────────────────── */
function sortedCommissioners(list: DbCommissioner[], filter: 'all' | 'soonest' | 'price'): DbCommissioner[] {
  const sorted = [...list];
  if (filter === 'soonest') {
    sorted.sort((a, b) => {
      if (!a.soonestSlot && !b.soonestSlot) return 0;
      if (!a.soonestSlot) return 1;
      if (!b.soonestSlot) return -1;
      return new Date(a.soonestSlot).getTime() - new Date(b.soonestSlot).getTime();
    });
  } else if (filter === 'price') {
    sorted.sort((a, b) => {
      const pa = a.first_page_cents ?? a.booking_fee_cents ?? 999999;
      const pb = b.first_page_cents ?? b.booking_fee_cents ?? 999999;
      return pa - pb;
    });
  }
  return sorted;
}

/* ── Main form ──────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

export default function BookingForm({ onClose, rebookToken }: { onClose: () => void; rebookToken?: string }) {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<BookingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [availableCommissioners, setAvailableCommissioners] = useState<DbCommissioner[]>([]);
  const [commissionersLoading, setCommissionersLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selectedCommissionerIdForSlots, setSelectedCommissionerIdForSlots] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  // Commissioner selection (step 2)
  const [selectedCommissioner, setSelectedCommissioner] = useState<DbCommissioner | null>(null);
  const [commFilter, setCommFilter] = useState<'all' | 'soonest' | 'price'>('soonest');

  // Fetch services on mount
  useEffect(() => {
    fetch('/api/booking/services')
      .then((r) => r.json())
      .then((json) => setServices(json.services ?? []))
      .finally(() => setServicesLoading(false));
  }, []);

  // Fetch commissioners when service is selected and user advances to step 2
  async function loadCommissioners(serviceSlug: string) {
    setCommissionersLoading(true);
    try {
      const res = await fetch(`/api/booking/commissioners?serviceSlug=${serviceSlug}`);
      const json = await res.json();
      setAvailableCommissioners(json.commissioners ?? []);
    } finally {
      setCommissionersLoading(false);
    }
  }

  const totalSteps = selectedService?.requiresReview ? 2 : 4;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  // Booking fee = minimum service charge (first document rate)
  const bookingFee = selectedCommissioner?.first_page_cents
    ?? selectedService?.price
    ?? selectedCommissioner?.booking_fee_cents
    ?? null;
  const bookingFeeLabel = bookingFee ? `$${(bookingFee / 100).toFixed(0)}` : null;

  /* ── Step 2 submit: save booking ──────────────────────────────────── */
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
          ...(rebookToken ? { rebookToken } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); return; }

      setBookingId(json.bookingId);
      trackBookingCreated(selectedService.name, data.commissionerId);

      if (json.requiresReview) {
        setPendingReview(true);
      } else if (json.paymentTransferred) {
        setSelectedCommissionerIdForSlots(data.commissionerId);
        setStep(4);
      } else {
        setSelectedCommissionerIdForSlots(data.commissionerId);
        setStep(4);
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step 3: Confirm slot → Stripe deposit ────────────────────────── */
  async function handleConfirmSlot() {
    if (!bookingId || !selectedSlot) return;
    setScheduling(true);
    setSlotError(null);

    try {
      const res = await fetch('/api/booking/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, appointmentDatetime: selectedSlot }),
      });
      const json = await res.json();

      if (!res.ok) {
        setSlotError(json.error || 'Could not book this slot. Please try another.');
        return;
      }

      if (json.paymentTransferred) {
        // Payment was already made — go straight to success
        setRedirecting(true);
        window.location.href = `${window.location.origin}/booking/success?appointment=confirmed`;
      } else if (json.checkoutUrl) {
        const fee = BOOKING_FEES[selectedCommissionerIdForSlots] ?? 0;
        trackSlotConfirmed(fee);
        trackConversion(fee);
        setRedirecting(true);
        window.location.href = json.checkoutUrl;
      }
    } catch {
      setSlotError('Network error. Please try again.');
    } finally {
      setScheduling(false);
    }
  }

  /* ── Pending review screen ────────────────────────────────────────── */
  if (pendingReview) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-teal" />
        </div>
        <h3 className="font-display font-bold text-xl text-charcoal">Request received!</h3>
        <p className="text-mid-grey text-sm leading-relaxed max-w-xs mx-auto">
          We'll review your request and contact you within 2 hours to confirm your appointment and arrange payment.
        </p>
        <div className="flex items-center gap-2 justify-center text-xs text-mid-grey pt-2">
          <Clock size={13} />
          <span>Mon–Fri 9 AM – 9 PM · Sat 10 AM – 5 PM</span>
        </div>
        <button onClick={onClose} className="btn-primary mx-auto mt-2">Done</button>
      </div>
    );
  }

  /* ── Redirecting to Stripe ────────────────────────────────────────── */
  if (redirecting) {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <Loader2 size={32} className="animate-spin text-gold" />
        <p className="text-charcoal font-medium">Redirecting to secure payment…</p>
        <p className="text-xs text-mid-grey">You'll be back in a moment to confirm your booking.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* ── Step 1: Service selection ──────────────────────────────── */}
      {step === 1 && (
        <div className="p-6">
          <StepDots step={1} total={totalSteps || 3} />
          <h3 className="font-display font-semibold text-lg text-charcoal mb-1">
            What service do you need?
          </h3>
          <p className="text-mid-grey text-sm mb-4">Select the service you're booking today.</p>

          {servicesLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-mid-grey text-sm">
              <Loader2 size={15} className="animate-spin" /> Loading services…
            </div>
          ) : (
            <ServiceSearch
              services={services}
              selected={selectedService}
              onSelect={(s) => setSelectedService(s)}
            />
          )}

          {selectedService && (
            <div className="mt-3 p-3 rounded-card border border-gold/30 bg-gold/5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-charcoal text-sm">{selectedService.name}</p>
                  <p className="text-xs text-mid-grey mt-0.5">{selectedService.shortDescription}</p>
                </div>
                <span className="text-sm font-semibold text-gold flex-shrink-0">{selectedService.priceLabel}</span>
              </div>
            </div>
          )}

          {selectedService?.requiresReview && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-card p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <p>{selectedService.reviewReason}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedService || servicesLoading}
            onClick={() => { trackServiceSelected(selectedService!.name); loadCommissioners(selectedService!.slug); setStep(2); }}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 2: Choose commissioner ─────────────────────────────── */}
      {step === 2 && (
        <div className="p-6">
          <StepDots step={2} total={totalSteps} />
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep(1)} className="text-mid-grey hover:text-charcoal transition-colors" aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">Choose a commissioner</h3>
              <p className="text-xs text-mid-grey">{selectedService?.name}</p>
            </div>
          </div>

          {/* Sort tabs */}
          <div className="flex gap-1.5 mb-3">
            {([['soonest', 'Soonest'], ['price', 'Lowest price'], ['all', 'All']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setCommFilter(key)}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${commFilter === key ? 'bg-navy text-white' : 'bg-bg text-mid-grey hover:bg-border'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
            {commissionersLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-mid-grey text-sm">
                <Loader2 size={15} className="animate-spin" /> Loading commissioners…
              </div>
            ) : (
              sortedCommissioners(availableCommissioners, commFilter).map((c) => {
                const price = c.first_page_cents ?? selectedService?.price ?? c.booking_fee_cents;
                const priceLabel = price ? `$${(price / 100).toFixed(0)}` : 'Quote';
                const soonest = c.soonestSlot
                  ? new Date(c.soonestSlot).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', weekday: 'short', month: 'short', day: 'numeric' })
                  : null;
                const isSelected = selectedCommissioner?.id === c.id;

                return (
                  <button key={c.id} type="button" onClick={() => setSelectedCommissioner(c)}
                    className={`w-full text-left p-4 rounded-card border-2 transition-all duration-150 ${isSelected ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50 hover:bg-bg'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-charcoal text-sm">{c.name}</p>
                        <p className="text-xs text-mid-grey mt-0.5">{c.location}{c.address ? ` · ${c.address}` : ''}</p>
                        {c.languages && c.languages.length > 0 && (
                          <p className="text-[11px] text-mid-grey mt-1">{c.languages.join(', ')}</p>
                        )}
                        {c.areas_served && c.areas_served.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.areas_served.slice(0, 4).map((a) => (
                              <span key={a} className="text-[10px] bg-bg text-mid-grey px-1.5 py-0.5 rounded-pill">{a}</span>
                            ))}
                            {c.areas_served.length > 4 && <span className="text-[10px] text-mid-grey">+{c.areas_served.length - 4} more</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-semibold text-gold">{priceLabel}</span>
                        {soonest && (
                          <span className="text-[10px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-pill font-medium whitespace-nowrap">
                            Next: {soonest}
                          </span>
                        )}
                        {!soonest && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-pill font-medium">
                            Request time
                          </span>
                        )}
                        <div className="flex gap-1 mt-0.5">
                          {c.mobile_available && <span className="text-[10px] bg-navy/5 text-navy px-1.5 py-0.5 rounded-pill">Mobile</span>}
                          {c.virtual_available && <span className="text-[10px] bg-navy/5 text-navy px-1.5 py-0.5 rounded-pill">Virtual</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            {!commissionersLoading && availableCommissioners.length === 0 && (
              <p className="text-center text-sm text-mid-grey py-6">No commissioners available for this service.</p>
            )}
          </div>

          <button type="button" disabled={!selectedCommissioner}
            onClick={() => { setValue('commissionerId', selectedCommissioner!.id); setStep(3); }}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 3: Details ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="p-6">
          <StepDots step={3} total={totalSteps} />

          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep(selectedService?.requiresReview ? 1 : 2)} className="text-mid-grey hover:text-charcoal transition-colors" aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">Your details</h3>
              <p className="text-xs text-mid-grey">{selectedService?.name} · {selectedCommissioner?.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Full name *</label>
              <input {...register('name')} type="text" placeholder="Jane Smith"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.name ? 'border-red-400' : 'border-border'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
              <input {...register('email')} type="email" placeholder="jane@example.com"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.email ? 'border-red-400' : 'border-border'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
              <input {...register('phone')} type="tel" placeholder="(403) 555-0123"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.phone ? 'border-red-400' : 'border-border'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <input type="hidden" {...register('commissionerId')} />

            {selectedService && !selectedService.requiresReview && selectedCommissioner && bookingFee && (
              <div className="bg-navy/5 border border-navy/10 rounded-card p-4 space-y-3">
                {/* Charged now */}
                <div>
                  <p className="text-xs font-medium text-mid-grey uppercase tracking-wide mb-2">Charged now</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-charcoal">First document (booking fee)</span>
                    <span className="text-base font-bold text-navy">{bookingFeeLabel}</span>
                  </div>
                </div>

                {/* Additional charges at appointment */}
                {(selectedCommissioner.additional_page_cents != null || selectedCommissioner.drafting_fee_cents != null || selectedCommissioner.mobile_travel_fee_cents != null) && (
                  <div className="border-t border-navy/10 pt-3">
                    <p className="text-xs font-medium text-mid-grey uppercase tracking-wide mb-2">Charged at appointment (if applicable)</p>
                    <div className="space-y-1.5 text-xs">
                      {selectedCommissioner.additional_page_cents != null && (
                        <div className="flex justify-between text-charcoal">
                          <span>Each additional document</span>
                          <span className="font-medium">${(selectedCommissioner.additional_page_cents / 100).toFixed(0)}</span>
                        </div>
                      )}
                      {selectedCommissioner.drafting_fee_cents != null && selectedCommissioner.drafting_fee_cents > 0 && (
                        <div className="flex justify-between text-charcoal">
                          <span>Document drafting</span>
                          <span className="font-medium">${(selectedCommissioner.drafting_fee_cents / 100).toFixed(0)}</span>
                        </div>
                      )}
                      {selectedCommissioner.mobile_available && selectedCommissioner.mobile_travel_fee_cents != null && (
                        <div className="flex justify-between text-charcoal">
                          <span>Mobile service travel fee</span>
                          <span className="font-medium">${(selectedCommissioner.mobile_travel_fee_cents / 100).toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-mid-grey leading-relaxed border-t border-navy/10 pt-2">
                  The booking fee covers your first document and secures your appointment. Any additional charges are collected when the service is rendered.
                </p>
              </div>
            )}

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
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : selectedService?.requiresReview ? (
                'Submit request'
              ) : (
                <><Calendar size={16} /> Book time</>
              )}
            </button>

            {selectedService && !selectedService.requiresReview && (
              <p className="text-center text-xs text-mid-grey">
                A booking fee of <strong>{bookingFeeLabel ?? '…'}</strong> will be charged after scheduling. Final price collected when service is rendered.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Pick a time slot ───────────────────────────────── */}
      {step === 4 && (
        <div className="p-6">
          <StepDots step={4} total={4} />

          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setStep(3); setSelectedSlot(''); setSlotError(null); }}
              className="text-mid-grey hover:text-charcoal transition-colors"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">
                Pick a date & time
              </h3>
              <p className="text-xs text-mid-grey">{selectedService?.name}</p>
            </div>
          </div>

          <SlotPicker
            commissionerId={selectedCommissionerIdForSlots}
            onSelect={(iso) => { setSelectedSlot(iso); setSlotError(null); }}
          />

          {slotError && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-card p-3 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <p>{slotError}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedSlot || scheduling}
            onClick={handleConfirmSlot}
            className="btn-primary w-full justify-center mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scheduling ? (
              <><Loader2 size={16} className="animate-spin" /> Confirming…</>
            ) : (
              <><Calendar size={16} /> Confirm & pay booking fee {bookingFeeLabel ? `— ${bookingFeeLabel}` : ''}</>
            )}
          </button>

          <p className="text-center text-xs text-mid-grey mt-2">
            Final price collected when service is rendered, based on the number of documents.
          </p>
        </div>
      )}
    </form>
  );
}
