'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, ChevronLeft, CheckCircle, Loader2, AlertCircle, Clock, MapPin, Globe, Search } from 'lucide-react';
import SlotPicker from '@/components/booking/SlotPicker';
import { BOOKING_FEES } from '@/lib/data/booking';
import { trackBookingCreated, trackSlotConfirmed, trackConversion } from '@/lib/analytics';

const detailsSchema = z.object({
  name: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  deliveryMode: z.enum(['in_office', 'mobile', 'virtual']).default('in_office'),
  customerAddress: z.string().optional(),
  notes: z.string().max(500).optional(),
});
type DetailsForm = z.infer<typeof detailsSchema>;

type VendorService = {
  slug: string;
  name: string;
  shortDescription: string;
  price: number | null;
  priceLabel: string;
  additionalPageCents: number;
  requiresReview: boolean;
  reviewReason?: string;
  slotDurationMinutes: number;
};

type VendorProfile = {
  id: string;
  name: string;
  title: string;
  location: string;
  address: string;
  languages: string[];
  credentials: string[];
  mobile_available: boolean;
  virtual_available: boolean;
};

type PricingConfig = {
  convenienceFeeCents: number;
  tax: { total_rate: number };
};

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? 'bg-gold w-8' : 'bg-border w-4'}`} />
      ))}
      <span className="text-xs text-mid-grey ml-2">Step {step} of {total}</span>
    </div>
  );
}

function VendorHeader({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
      <div className="w-11 h-11 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
        <span className="text-white font-display font-bold text-sm">
          {vendor.name.split(' ').map((n: string) => n[0]).join('')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-charcoal text-sm">{vendor.name}</p>
        <p className="text-xs text-mid-grey">{vendor.title}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-mid-grey">
          <span className="flex items-center gap-1"><MapPin size={10} /> {vendor.location}</span>
          <span className="flex items-center gap-1"><Globe size={10} /> {vendor.languages?.join(', ')}</span>
        </div>
      </div>
    </div>
  );
}

export default function VendorBookingForm({ vendorId }: { vendorId: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [services, setServices] = useState<VendorService[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);
  const [query, setQuery] = useState('');

  // Step 2
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [deliveryTab, setDeliveryTab] = useState<'in_office' | 'mobile' | 'virtual'>('in_office');

  // Mobile
  const [customerAddr, setCustomerAddr] = useState('');
  const [travelFeeData, setTravelFeeData] = useState<{ travelFeeCents: number; distanceKm: number | null; distanceText?: string } | null>(null);
  const [travelFeeLoading, setTravelFeeLoading] = useState(false);
  const isMobile = deliveryTab === 'mobile';
  const travelFee = isMobile ? (travelFeeData?.travelFeeCents ?? 3000) : 0;

  // Pricing
  const [pricing, setPricing] = useState<PricingConfig>({ convenienceFeeCents: 499, tax: { total_rate: 0.05 } });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  // Load vendor profile
  useEffect(() => {
    Promise.all([
      fetch(`/api/booking/vendor-profile?vendorId=${vendorId}`).then((r) => r.json()),
      fetch('/api/booking/pricing').then((r) => r.json()).catch(() => null),
    ]).then(([data, pricingData]) => {
      if (data.error) { setError(data.error); setLoading(false); return; }
      setVendor(data.vendor);
      setServices(data.services ?? []);
      setLocationId(data.locationId);
      if (pricingData) setPricing(pricingData);
      setLoading(false);
    }).catch(() => { setError('Failed to load'); setLoading(false); });
  }, [vendorId]);

  const bookingFee = selectedService?.price ?? null;
  const convFee = pricing.convenienceFeeCents;
  const subtotal = (bookingFee ?? 0) + travelFee + convFee;
  const taxAmount = Math.round(subtotal * pricing.tax.total_rate);
  const totalCharged = subtotal + taxAmount;
  const totalSteps = selectedService?.requiresReview ? 1 : 3;

  async function calcTravelFee(address: string) {
    if (!address) return;
    setTravelFeeLoading(true);
    try {
      const res = await fetch(`/api/booking/travel-fee?commissionerId=${vendorId}&address=${encodeURIComponent(address)}`);
      setTravelFeeData(await res.json());
    } catch { setTravelFeeData(null); }
    finally { setTravelFeeLoading(false); }
  }

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
          commissionerId: vendorId,
          name: data.name, email: data.email, phone: data.phone,
          notes: data.notes || '',
          deliveryMode: deliveryTab,
          customerAddress: data.customerAddress || '',
          facilityName: isMobile ? (document.querySelector<HTMLInputElement>('[name="facilityName"]')?.value || '') : '',
          customerUnit: isMobile ? (document.querySelector<HTMLInputElement>('[name="customerUnit"]')?.value || '') : '',
          travelFeeCents: travelFee,
          locationId: locationId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setBookingId(json.bookingId);
      trackBookingCreated(selectedService.name, vendorId);
      if (json.requiresReview) { setPendingReview(true); }
      else { setStep(3); }
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  }

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
      if (!res.ok) { setSlotError(json.error); return; }
      if (json.paymentTransferred) {
        setRedirecting(true);
        window.location.href = '/booking/success?appointment=confirmed';
      } else if (json.checkoutUrl) {
        trackSlotConfirmed(bookingFee ?? 0);
        trackConversion(bookingFee ?? 0);
        setRedirecting(true);
        window.location.href = json.checkoutUrl;
      }
    } catch { setSlotError('Network error.'); }
    finally { setScheduling(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-mid-grey">
        <Loader2 size={20} className="animate-spin" /> Loading...
      </div>
    );
  }

  if (error && !vendor) {
    return <p className="text-center text-mid-grey py-16">{error}</p>;
  }

  if (pendingReview) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-teal" />
        </div>
        <h3 className="font-display font-bold text-xl text-charcoal">Request received!</h3>
        <p className="text-mid-grey text-sm max-w-xs mx-auto">We'll review your request and contact you within 2 hours.</p>
        <div className="flex items-center gap-2 justify-center text-xs text-mid-grey pt-2">
          <Clock size={13} /><span>By appointment only</span>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <Loader2 size={32} className="animate-spin text-gold" />
        <p className="text-charcoal font-medium">Redirecting to secure payment...</p>
      </div>
    );
  }

  const filtered = query
    ? services.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : services;

  return (
    <div>
      {vendor && <VendorHeader vendor={vendor} />}

      {/* Step 1 — Select Service */}
      {step === 1 && (
        <div>
          <StepDots step={1} total={totalSteps || 3} />
          <h3 className="font-display font-semibold text-lg text-charcoal mb-1">Select a service</h3>
          <p className="text-mid-grey text-sm mb-4">Choose the service you need from {vendor?.name.split(' ')[0]}.</p>

          {services.length > 6 && (
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-3 text-mid-grey pointer-events-none" />
              <input type="text" placeholder="Search services..." value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
            {filtered.map((s) => {
              const isSelected = selectedService?.slug === s.slug;
              return (
                <button key={s.slug} type="button" onClick={() => setSelectedService(s)}
                  className={`w-full text-left p-3 rounded-card border-2 transition-all ${isSelected ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-charcoal text-sm leading-snug flex-1">{s.name}</p>
                    {isSelected && <CheckCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />}
                  </div>
                  {s.price != null && (
                    <span className="text-sm font-semibold text-gold mt-1 block">{s.priceLabel}</span>
                  )}
                  {s.requiresReview ? (
                    <span className="inline-block text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-pill font-medium mt-1.5">Manual review</span>
                  ) : (
                    <span className="inline-block text-[10px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-pill font-medium mt-1.5">Book instantly</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedService?.requiresReview && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-card p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><p>{selectedService.reviewReason}</p>
            </div>
          )}

          <button type="button" disabled={!selectedService}
            onClick={() => setStep(2)}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2 — Details */}
      {step === 2 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <StepDots step={2} total={totalSteps} />
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep(1)} className="text-mid-grey hover:text-charcoal"><ChevronLeft size={18} /></button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">Your details</h3>
              <p className="text-xs text-mid-grey">{selectedService?.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Full name *</label>
              <input {...register('name')} type="text" placeholder="Jane Smith"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 ${errors.name ? 'border-red-400' : 'border-border'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
              <input {...register('email')} type="email" placeholder="jane@example.com"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 ${errors.email ? 'border-red-400' : 'border-border'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
              <input {...register('phone')} type="tel" placeholder="(403) 555-0123"
                className={`w-full border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 ${errors.phone ? 'border-red-400' : 'border-border'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Delivery mode */}
            {(vendor?.mobile_available || vendor?.virtual_available) && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Appointment type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['in_office', 'mobile', 'virtual'] as const).map((mode) => {
                    if (mode === 'mobile' && !vendor?.mobile_available) return null;
                    if (mode === 'virtual' && !vendor?.virtual_available) return null;
                    const labels = { in_office: 'In-Office', mobile: 'Mobile', virtual: 'Virtual' };
                    return (
                      <button key={mode} type="button" onClick={() => setDeliveryTab(mode)}
                        className={`p-2.5 rounded-card border-2 text-xs font-medium transition-all ${deliveryTab === mode ? 'border-gold bg-gold/5 text-charcoal' : 'border-border text-mid-grey hover:border-gold/40'}`}>
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isMobile && (
              <div className="space-y-3 bg-gold/5 border border-gold/20 rounded-card p-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Your address *</label>
                  <div className="flex gap-2">
                    <input {...register('customerAddress')} type="text" placeholder="123 Main St, Calgary, AB"
                      value={customerAddr} onChange={(e) => { setCustomerAddr(e.target.value); setValue('customerAddress', e.target.value); }}
                      className="flex-1 border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40" />
                    <button type="button" disabled={!customerAddr || travelFeeLoading} onClick={() => calcTravelFee(customerAddr)}
                      className="rounded-btn bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50 flex-shrink-0">
                      {travelFeeLoading ? '...' : 'Calculate'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Facility name</label>
                    <input type="text" name="facilityName" placeholder="e.g. Foothills Hospital"
                      className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Unit / Room</label>
                    <input type="text" name="customerUnit" placeholder="e.g. Suite 200"
                      className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40" />
                  </div>
                </div>
                {travelFeeData && (
                  <div className="flex justify-between text-sm text-charcoal">
                    <span>Travel fee {travelFeeData.distanceText ? `(${travelFeeData.distanceText})` : ''}</span>
                    <span className="font-semibold text-gold">${(travelFeeData.travelFeeCents / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {deliveryTab === 'virtual' && (
              <div className="bg-navy/5 border border-navy/10 rounded-card p-3">
                <p className="text-xs text-mid-grey">Virtual appointment — you'll receive a video call link by email after booking.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Notes <span className="text-mid-grey font-normal">(optional)</span></label>
              <textarea {...register('notes')} rows={2} placeholder="Anything we should know..."
                className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40" />
            </div>

            {/* Price breakdown */}
            {bookingFee && !selectedService?.requiresReview && (
              <div className="bg-navy/5 border border-navy/10 rounded-card p-4 space-y-2 text-sm">
                <p className="text-xs font-medium text-mid-grey uppercase tracking-wide mb-2">Charged now</p>
                <div className="flex justify-between"><span>Service fee</span><span>${(bookingFee / 100).toFixed(2)}</span></div>
                {isMobile && travelFee > 0 && <div className="flex justify-between"><span>Travel fee</span><span>${(travelFee / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>Convenience fee</span><span>${(convFee / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax ({(pricing.tax.total_rate * 100).toFixed(0)}%)</span><span>${(taxAmount / 100).toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-charcoal border-t border-border pt-2"><span>Total</span><span>${(totalCharged / 100).toFixed(2)}</span></div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="btn-primary w-full justify-center disabled:opacity-40">
              {submitting ? 'Submitting...' : 'Continue'} <ChevronRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Step 3 — Pick Time */}
      {step === 3 && (
        <div>
          <StepDots step={3} total={totalSteps} />
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep(2)} className="text-mid-grey hover:text-charcoal"><ChevronLeft size={18} /></button>
            <div>
              <h3 className="font-display font-semibold text-lg text-charcoal leading-tight">Pick a time</h3>
              <p className="text-xs text-mid-grey">{selectedService?.name} · {vendor?.name}</p>
            </div>
          </div>

          <SlotPicker
            commissionerId={vendorId}
            locationId={locationId ?? undefined}
            onSelect={(slot) => setSelectedSlot(slot)}
          />

          {slotError && <p className="text-red-500 text-sm mt-3">{slotError}</p>}

          <button type="button" disabled={!selectedSlot || scheduling}
            onClick={handleConfirmSlot}
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40">
            {scheduling ? 'Booking...' : 'Confirm & Pay'} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
