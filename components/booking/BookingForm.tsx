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
  deliveryMode: z.enum(['in_office', 'mobile', 'virtual']).default('in_office'),
  customerAddress: z.string().optional(),
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

/* ── Service card grid ─────────────────────────────────────────────────── */
function ServiceGrid({ services, selected, onSelect }: {
  services: BookingService[];
  selected: BookingService | null;
  onSelect: (s: BookingService) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? services.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.shortDescription.toLowerCase().includes(query.toLowerCase()))
    : services;

  return (
    <div>
      {services.length > 6 && (
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-3.5 text-mid-grey pointer-events-none" />
          <input
            type="text"
            placeholder="Search services…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-btn text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition bg-white"
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="col-span-full px-4 py-3 text-sm text-mid-grey">No services found</div>
        ) : (
          filtered.map((s) => {
            const isSelected = selected?.slug === s.slug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => onSelect(s)}
                className={`w-full text-left p-3 rounded-card border-2 transition-all ${
                  isSelected
                    ? 'border-gold bg-gold/5 shadow-sm'
                    : 'border-border bg-white hover:border-gold/40 hover:bg-bg'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-charcoal text-sm leading-snug flex-1 min-w-0">{s.name}</p>
                  {isSelected && <CheckCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />}
                </div>
                {s.requiresReview ? (
                  <span className="inline-block text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-pill font-medium mt-1.5">
                    Manual review
                  </span>
                ) : (
                  <span className="inline-block text-[10px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-pill font-medium mt-1.5">
                    Book instantly
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


/** Each option is a location + its commissioner's info */
type LocationOption = {
  locationId: string;
  locationName: string;
  locationAddress: string;
  areas_served?: string[];
  commissionerId: string;
  commissionerName: string;
  languages?: string[];
  mobile_available?: boolean;
  mobile_travel_fee_cents?: number | null;
  virtual_available?: boolean;
  commission_rate?: number;
  commission_mode?: 'absorb' | 'pass_to_customer';
  booking_fee_cents?: number;
  first_page_cents?: number | null;
  additional_page_cents?: number | null;
  drafting_fee_cents?: number | null;
  soonestSlot?: string | null;
  hasAvailability?: boolean;
};

type PricingConfig = {
  convenienceFeeCents: number;
  tax: { total_rate: number; gst_rate: number; pst_rate: number; hst_rate: number };
};

/** Calculate customer-facing price for a commissioner's service rate */
function customerPrice(baseCents: number, comm: { commission_mode?: string; commission_rate?: number }): number {
  if (comm.commission_mode === 'pass_to_customer' && comm.commission_rate) {
    return Math.round(baseCents * (1 + comm.commission_rate / 100));
  }
  return baseCents;
}

/* ── Sort location options ─────────────────────────────────────────────── */
function sortedOptions(list: LocationOption[], filter: 'all' | 'soonest' | 'price'): LocationOption[] {
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

/* ── Area search dropdown ─────────────────────────────────────────────── */
function AreaSearch({ options, onFilter }: { options: LocationOption[]; onFilter: (q: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Build unique area list from all location options
  const allAreas = Array.from(
    new Set(options.flatMap((o) => o.areas_served ?? []))
  ).sort();

  const filtered = query
    ? allAreas.filter((a) => a.toLowerCase().includes(query.toLowerCase()))
    : allAreas;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(area: string) {
    setQuery(area);
    onFilter(area);
    setOpen(false);
  }

  function clear() {
    setQuery('');
    onFilter('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative mb-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-grey pointer-events-none" />
        <input
          type="text"
          placeholder="Search by area, postal code, or neighbourhood…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onFilter(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2.5 border border-border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition bg-white"
        />
        {query && (
          <button type="button" onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mid-grey hover:text-charcoal text-xs">
            ✕
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-44 overflow-y-auto">
          {filtered.map((area) => (
            <li key={area}>
              <button type="button" onClick={() => select(area)}
                className="w-full px-3 py-2 text-left text-sm text-charcoal hover:bg-bg transition-colors">
                {area}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Main form ──────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

export default function BookingForm({ onClose, rebookToken }: { onClose: () => void; rebookToken?: string }) {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<BookingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selectedCommIdForSlots, setSelectedCommIdForSlots] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  // Commissioner selection (step 2)
  const [selectedOption, setSelectedOption] = useState<LocationOption | null>(null);
  const [commFilter, setCommFilter] = useState<'all' | 'soonest' | 'price'>('soonest');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [deliveryTab, setDeliveryTab] = useState<'in_office' | 'mobile' | 'virtual'>('in_office');
  // Pricing config
  const [pricing, setPricing] = useState<PricingConfig>({ convenienceFeeCents: 499, tax: { total_rate: 0.05, gst_rate: 0.05, pst_rate: 0, hst_rate: 0 } });

  // Fetch services + pricing on mount
  useEffect(() => {
    fetch('/api/booking/services')
      .then((r) => r.json())
      .then((json) => setServices(json.services ?? []))
      .finally(() => setServicesLoading(false));
    fetch('/api/booking/pricing')
      .then((r) => r.json())
      .then((data) => setPricing(data))
      .catch(() => {});
  }, []);

  // Fetch commissioners when service is selected and user advances to step 2
  async function loadOptions(serviceSlug: string) {
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/booking/commissioners?serviceSlug=${serviceSlug}`);
      const json = await res.json();
      setLocationOptions(json.options ?? []);
    } finally {
      setOptionsLoading(false);
    }
  }

  const totalSteps = selectedService?.requiresReview ? 2 : 4;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  // Delivery mode + dynamic travel fee
  const isMobile = deliveryTab === 'mobile';
  const [travelFeeData, setTravelFeeData] = useState<{ travelFeeCents: number; distanceKm: number | null; distanceText?: string; durationText?: string } | null>(null);
  const [travelFeeLoading, setTravelFeeLoading] = useState(false);
  const [customerAddr, setCustomerAddr] = useState('');
  const travelFee = isMobile ? (travelFeeData?.travelFeeCents ?? selectedOption?.mobile_travel_fee_cents ?? 3000) : 0;

  async function calcTravelFee(address: string) {
    if (!address || !selectedOption) return;
    setTravelFeeLoading(true);
    try {
      const params = new URLSearchParams({ commissionerId: selectedOption.commissionerId, address });
      const res = await fetch(`/api/booking/travel-fee?${params}`);
      const data = await res.json();
      setTravelFeeData(data);
    } catch {
      setTravelFeeData(null);
    } finally {
      setTravelFeeLoading(false);
    }
  }

  // Booking fee = minimum service charge (first document rate), adjusted for commission mode
  const baseServiceFee = selectedOption?.first_page_cents ?? selectedService?.price ?? selectedOption?.booking_fee_cents ?? null;
  const bookingFee = baseServiceFee && selectedOption ? customerPrice(baseServiceFee, selectedOption) : baseServiceFee;
  const bookingFeeLabel = bookingFee ? `$${(bookingFee / 100).toFixed(2)}` : null;

  // Full breakdown for display
  const convFee = pricing.convenienceFeeCents;
  const subtotal = (bookingFee ?? 0) + travelFee + convFee;
  const taxAmount = Math.round(subtotal * pricing.tax.total_rate);
  const totalCharged = subtotal + taxAmount;

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
          deliveryMode: data.deliveryMode || 'in_office',
          customerAddress: data.customerAddress || '',
          facilityName: isMobile ? (document.querySelector<HTMLInputElement>('[name="facilityName"]')?.value || '') : '',
          customerUnit: isMobile ? (document.querySelector<HTMLInputElement>('[name="customerUnit"]')?.value || '') : '',
          travelFeeCents: isMobile ? travelFee : 0,
          travelDistanceKm: travelFeeData?.distanceKm ?? null,
          locationId: selectedOption?.locationId || null,
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
        setSelectedCommIdForSlots(data.commissionerId);
        setStep(4);
      } else {
        setSelectedCommIdForSlots(data.commissionerId);
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
        const fee = BOOKING_FEES[selectedCommIdForSlots] ?? 0;
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
        <div className="p-4 sm:p-6">
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
            <ServiceGrid
              services={services}
              selected={selectedService}
              onSelect={(s) => setSelectedService(s)}
            />
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
            onClick={() => { trackServiceSelected(selectedService!.name); loadOptions(selectedService!.slug); setStep(2); }}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 2: Choose commissioner ─────────────────────────────── */}
      {step === 2 && (
        <div className="p-4 sm:p-6">
          <StepDots step={2} total={totalSteps} />
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => { if (deliveryTab !== 'in_office' && !selectedOption) { setDeliveryTab('in_office'); } else { setStep(1); setDeliveryTab('in_office'); } }} className="text-mid-grey hover:text-charcoal transition-colors" aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">
                {deliveryTab === 'in_office' ? 'Choose a location' : deliveryTab === 'mobile' ? 'Choose a commissioner — Mobile' : 'Choose a commissioner — Virtual'}
              </h3>
              <p className="text-xs text-mid-grey">{selectedService?.name}</p>
            </div>
          </div>

          {/* Delivery mode cards */}
          {(() => {
            const inOfficeCount = locationOptions.length;
            const mobileCount = locationOptions.filter((o) => o.mobile_available).length;
            const virtualCount = locationOptions.filter((o) => o.virtual_available).length;

            return (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button type="button"
                  onClick={() => { setDeliveryTab('in_office'); setSelectedOption(null); }}
                  className={`rounded-card border-2 p-3 text-center transition-all ${deliveryTab === 'in_office' ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40'}`}
                >
                  <p className="text-xs font-medium text-charcoal">In-Office</p>
                  <p className="text-[10px] text-mid-grey mt-0.5">{inOfficeCount} location{inOfficeCount !== 1 ? 's' : ''}</p>
                </button>
                {mobileCount > 0 && (
                  <button type="button"
                    onClick={() => { setDeliveryTab('mobile'); setSelectedOption(null); }}
                    className={`rounded-card border-2 p-3 text-center transition-all ${deliveryTab === 'mobile' ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40'}`}
                  >
                    <p className="text-xs font-medium text-charcoal">Mobile</p>
                    <p className="text-[10px] text-mid-grey mt-0.5">{mobileCount} commissioner{mobileCount !== 1 ? 's' : ''}</p>
                  </button>
                )}
                {virtualCount > 0 && (
                  <button type="button"
                    onClick={() => { setDeliveryTab('virtual'); setSelectedOption(null); }}
                    className={`rounded-card border-2 p-3 text-center transition-all ${deliveryTab === 'virtual' ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40'}`}
                  >
                    <p className="text-xs font-medium text-charcoal">Virtual</p>
                    <p className="text-[10px] text-mid-grey mt-0.5">{virtualCount} commissioner{virtualCount !== 1 ? 's' : ''}</p>
                  </button>
                )}
              </div>
            );
          })()}

          {deliveryTab === 'mobile' && (
            <p className="text-xs text-mid-grey mb-3 bg-gold/5 border border-gold/20 rounded-btn p-2">
              We come to your home, office, hospital, or care facility. A distance-based travel fee will be added at checkout.
            </p>
          )}
          {deliveryTab === 'virtual' && (
            <p className="text-xs text-mid-grey mb-3 bg-navy/5 border border-navy/10 rounded-btn p-2">
              Video call appointment. You&apos;ll receive a meeting link after booking.
            </p>
          )}

          {/* Sort tabs + area search */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {([['soonest', 'Soonest'], ['price', 'Lowest price'], ['all', 'All']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setCommFilter(key)}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${commFilter === key ? 'bg-navy text-white' : 'bg-bg text-mid-grey hover:bg-border'}`}>
                {label}
              </button>
            ))}
          </div>

          {deliveryTab === 'in_office' && (
            <AreaSearch
              options={locationOptions}
              onFilter={setAreaFilter}
            />
          )}

          <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
            {optionsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-mid-grey text-sm">
                <Loader2 size={15} className="animate-spin" /> Loading locations…
              </div>
            ) : (
              sortedOptions((() => {
                // 1. Filter by delivery mode
                let filtered = locationOptions;
                if (deliveryTab === 'mobile') {
                  filtered = filtered.filter((o) => o.mobile_available);
                } else if (deliveryTab === 'virtual') {
                  filtered = filtered.filter((o) => o.virtual_available);
                }
                // 2. Filter by area search (in-office only)
                if (areaFilter && deliveryTab === 'in_office') {
                  const q = areaFilter.toLowerCase();
                  filtered = filtered.filter((opt) =>
                    opt.locationName.toLowerCase().includes(q) ||
                    opt.locationAddress?.toLowerCase().includes(q) ||
                    (opt.areas_served ?? []).some((a) => a.toLowerCase().includes(q))
                  );
                }
                return filtered;
              })(), commFilter).map((opt) => {
                const basePrice = opt.first_page_cents ?? selectedService?.price ?? opt.booking_fee_cents;
                const price = basePrice ? customerPrice(basePrice, opt) : null;
                const priceLabel = price ? `$${(price / 100).toFixed(0)}` : 'Quote';
                const soonest = opt.soonestSlot
                  ? new Date(opt.soonestSlot).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', weekday: 'short', month: 'short', day: 'numeric' })
                  : null;
                const isSelected = selectedOption?.locationId === opt.locationId;

                return (
                  <button key={opt.locationId} type="button" onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-4 rounded-card border-2 transition-all duration-150 ${isSelected ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50 hover:bg-bg'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-charcoal text-sm">{opt.locationName}</p>
                        {opt.locationAddress && <p className="text-xs text-mid-grey mt-0.5">{opt.locationAddress}</p>}
                        <p className="text-[11px] text-mid-grey mt-1">Commissioner: {opt.commissionerName}</p>
                        {opt.languages && opt.languages.length > 0 && (
                          <p className="text-[11px] text-mid-grey">{opt.languages.join(', ')}</p>
                        )}
                        {opt.areas_served && opt.areas_served.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {opt.areas_served.slice(0, 4).map((a) => (
                              <span key={a} className="text-[10px] bg-bg text-mid-grey px-1.5 py-0.5 rounded-pill">{a}</span>
                            ))}
                            {opt.areas_served.length > 4 && <span className="text-[10px] text-mid-grey">+{opt.areas_served.length - 4} more</span>}
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
                          {opt.mobile_available && <span className="text-[10px] bg-navy/5 text-navy px-1.5 py-0.5 rounded-pill">Mobile</span>}
                          {opt.virtual_available && <span className="text-[10px] bg-navy/5 text-navy px-1.5 py-0.5 rounded-pill">Virtual</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            {!optionsLoading && locationOptions.length === 0 && (
              <p className="text-center text-sm text-mid-grey py-6">No locations available for this service.</p>
            )}
            {!optionsLoading && locationOptions.length > 0 && (() => {
              let filtered = locationOptions;
              if (deliveryTab === 'mobile') filtered = filtered.filter((o) => o.mobile_available);
              else if (deliveryTab === 'virtual') filtered = filtered.filter((o) => o.virtual_available);
              if (areaFilter && deliveryTab === 'in_office') {
                const q = areaFilter.toLowerCase();
                filtered = filtered.filter((o) => o.locationName.toLowerCase().includes(q) || o.locationAddress?.toLowerCase().includes(q) || (o.areas_served ?? []).some((a) => a.toLowerCase().includes(q)));
              }
              return filtered.length === 0;
            })() && (
              <p className="text-center text-sm text-mid-grey py-6">
                {deliveryTab === 'mobile' ? 'No commissioners offer mobile service for this service.' :
                 deliveryTab === 'virtual' ? 'No commissioners offer virtual service for this service.' :
                 areaFilter ? `No locations match "${areaFilter}".` : 'No locations available.'}
              </p>
            )}
          </div>

          <button type="button" disabled={!selectedOption}
            onClick={() => {
              setValue('commissionerId', selectedOption!.commissionerId);
              setValue('deliveryMode', deliveryTab);
              setStep(3);
            }}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 3: Details ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="p-4 sm:p-6">
          <StepDots step={3} total={totalSteps} />

          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep(selectedService?.requiresReview ? 1 : 2)} className="text-mid-grey hover:text-charcoal transition-colors" aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">Your details</h3>
              <p className="text-xs text-mid-grey">{selectedService?.name} · {selectedOption?.locationName} · {selectedOption?.commissionerName}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Full name *</label>
              <input {...register('name')} type="text" placeholder="Jane Smith"
                className={`w-full border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.name ? 'border-red-400' : 'border-border'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
              <input {...register('email')} type="email" placeholder="jane@example.com"
                className={`w-full border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.email ? 'border-red-400' : 'border-border'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
              <input {...register('phone')} type="tel" placeholder="(403) 555-0123"
                className={`w-full border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition ${errors.phone ? 'border-red-400' : 'border-border'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <input type="hidden" {...register('commissionerId')} />
            <input type="hidden" {...register('deliveryMode')} />

            {/* Address + facility for mobile bookings */}
            {deliveryTab === 'mobile' && (
              <div className="space-y-3">
                <div className="bg-gold/5 border border-gold/20 rounded-card p-3">
                  <p className="text-xs font-medium text-charcoal">Mobile Service</p>
                  <p className="text-xs text-mid-grey mt-0.5">Commissioner will travel to your location. Enter your address below.</p>
                </div>
                {(
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Your address *</label>
                      <div className="flex gap-2">
                        <input
                          {...register('customerAddress')}
                          type="text"
                          placeholder="123 Main St, Calgary, AB"
                          value={customerAddr}
                          onChange={(e) => { setCustomerAddr(e.target.value); setValue('customerAddress', e.target.value); }}
                          className="flex-1 border border-border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                        />
                        <button
                          type="button"
                          disabled={!customerAddr || travelFeeLoading}
                          onClick={() => calcTravelFee(customerAddr)}
                          className="rounded-btn bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50 flex-shrink-0"
                        >
                          {travelFeeLoading ? 'Calculating...' : 'Calculate'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Facility name</label>
                        <input
                          type="text"
                          name="facilityName"
                          placeholder="e.g. Foothills Hospital"
                          className="w-full border border-border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Unit / Room #</label>
                        <input
                          type="text"
                          name="customerUnit"
                          placeholder="e.g. Suite 200, Room 4B"
                          className="w-full border border-border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                        />
                      </div>
                    </div>

                    {travelFeeData && (
                      <div className="bg-gold/5 border border-gold/20 rounded-btn p-3 text-sm">
                        <div className="flex justify-between text-charcoal">
                          <span>
                            Travel fee
                            {travelFeeData.distanceKm != null && (
                              <span className="text-mid-grey font-normal"> ({travelFeeData.distanceText}{travelFeeData.durationText ? ` · ~${travelFeeData.durationText}` : ''})</span>
                            )}
                          </span>
                          <span className="font-semibold text-gold">${(travelFeeData.travelFeeCents / 100).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-mid-grey mt-1">$3/km, minimum $30. Charged upfront with your booking.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {deliveryTab === 'virtual' && (
              <div className="bg-navy/5 border border-navy/10 rounded-card p-3">
                <p className="text-xs font-medium text-charcoal">Virtual Appointment</p>
                <p className="text-xs text-mid-grey mt-0.5">You&apos;ll receive a video call link by email after booking.</p>
              </div>
            )}

            {selectedService && !selectedService.requiresReview && selectedOption && bookingFee && (
              <div className="bg-navy/5 border border-navy/10 rounded-card p-4 space-y-3">
                {/* Charged now — full breakdown */}
                <div>
                  <p className="text-xs font-medium text-mid-grey uppercase tracking-wide mb-2">Charged now</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-charcoal">
                      <span>Service fee (first document)</span>
                      <span>{bookingFeeLabel}</span>
                    </div>
                    {isMobile && travelFee > 0 && (
                      <div className="flex justify-between text-charcoal">
                        <span>Mobile travel fee</span>
                        <span>${(travelFee / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-charcoal">
                      <span>Convenience fee</span>
                      <span>${(convFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-charcoal">
                      <span>Tax ({(pricing.tax.total_rate * 100).toFixed(0)}%{pricing.tax.gst_rate > 0 && pricing.tax.pst_rate === 0 && pricing.tax.hst_rate === 0 ? ' GST' : pricing.tax.hst_rate > 0 ? ' HST' : ' GST+PST'})</span>
                      <span>${(taxAmount / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-navy border-t border-navy/10 pt-1.5">
                      <span>Total</span>
                      <span>${(totalCharged / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional charges at appointment */}
                {(selectedOption.additional_page_cents != null || selectedOption.drafting_fee_cents != null || selectedOption.mobile_travel_fee_cents != null) && (
                  <div className="border-t border-navy/10 pt-3">
                    <p className="text-xs font-medium text-mid-grey uppercase tracking-wide mb-2">At appointment (if applicable)</p>
                    <div className="space-y-1.5 text-xs">
                      {selectedOption.additional_page_cents != null && (
                        <div className="flex justify-between text-charcoal">
                          <span>Each additional document</span>
                          <span className="font-medium">${(customerPrice(selectedOption.additional_page_cents, selectedOption) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOption.drafting_fee_cents != null && selectedOption.drafting_fee_cents > 0 && (
                        <div className="flex justify-between text-charcoal">
                          <span>Document drafting</span>
                          <span className="font-medium">${(customerPrice(selectedOption.drafting_fee_cents, selectedOption) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {/* Mobile travel fee is charged upfront, not at appointment */}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-mid-grey leading-relaxed border-t border-navy/10 pt-2">
                  The booking fee secures your appointment and covers the first document. Additional charges are collected when the service is rendered. All prices include applicable platform fees.
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
                className="w-full border border-border rounded-btn px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition resize-none"
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
                Total of <strong>${(totalCharged / 100).toFixed(2)}</strong> (incl. convenience fee + tax) will be charged after scheduling. Additional documents charged at appointment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Pick a time slot ───────────────────────────────── */}
      {step === 4 && (
        <div className="p-4 sm:p-6">
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
            commissionerId={selectedCommIdForSlots}
            locationId={selectedOption?.locationId || undefined}
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
              <><Calendar size={16} /> Confirm & pay — ${totalCharged ? `$${(totalCharged / 100).toFixed(2)}` : '…'}</>
            )}
          </button>

          <p className="text-center text-xs text-mid-grey mt-2">
            Additional documents charged at your appointment.
          </p>
        </div>
      )}
    </form>
  );
}
