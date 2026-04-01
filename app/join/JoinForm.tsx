'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitJoinForm } from '@/app/actions/join';

const credentialOptions = ['Commissioner of Oaths', 'Notary Public', 'Barrister & Solicitor'];

const inputCls = 'w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold';
const selectCls = inputCls;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed">
      {pending ? 'Submitting...' : 'Submit Application'}
    </button>
  );
}

type Service = { slug: string; name: string };

export default function JoinForm() {
  const [state, action] = useFormState(submitJoinForm, { success: false, message: '' });
  const [services, setServices] = useState<Service[]>([]);
  const [mobileAvail, setMobileAvail] = useState('');
  const [selectedCreds, setSelectedCreds] = useState<string[]>([]);

  useEffect(() => {
    // Fetch services from DB, excluding in-house and inactive
    fetch('/api/booking/services')
      .then((r) => r.json())
      .then((data) => {
        // The API returns services that are active; filter out mobile-service as it's a delivery mode
        const filtered = (data.services || data || []).filter(
          (s: Service & { slug: string }) => s.slug !== 'mobile-service' && s.slug !== 'apostille-legalization'
        );
        setServices(filtered);
      })
      .catch(() => {});
  }, []);

  const showVirtualOption = selectedCreds.some((c) => c === 'Notary Public' || c === 'Barrister & Solicitor');

  if (state.success) {
    return (
      <div className="bg-teal/10 border border-teal/30 rounded-card p-8 text-center">
        <p className="text-teal font-display font-semibold text-xl mb-2">Application received!</p>
        <p className="text-charcoal">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      {state.message && !state.success && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-red-700 text-sm">{state.message}</div>
      )}

      {/* Section A — Personal */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">A. Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-charcoal mb-1.5">Full legal name <span className="text-red-500">*</span></label>
            <input id="fullName" name="fullName" type="text" required className={inputCls} />
            {state.errors?.fullName && <p className="text-red-500 text-xs mt-1">{state.errors.fullName[0]}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">Email <span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" required className={inputCls} />
            {state.errors?.email && <p className="text-red-500 text-xs mt-1">{state.errors.email[0]}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-1.5">Phone <span className="text-red-500">*</span></label>
            <input id="phone" name="phone" type="tel" required className={inputCls} />
            {state.errors?.phone && <p className="text-red-500 text-xs mt-1">{state.errors.phone[0]}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-charcoal mb-1.5">Full address <span className="text-red-500">*</span></label>
            <input id="address" name="address" type="text" required placeholder="123 Main St, Calgary, AB T2X 0A1" className={inputCls} />
            {state.errors?.address && <p className="text-red-500 text-xs mt-1">{state.errors.address[0]}</p>}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-charcoal mb-1.5">City <span className="text-red-500">*</span></label>
            <input id="city" name="city" type="text" required className={inputCls} />
          </div>
        </div>
      </section>

      {/* Section B — Credentials */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">B. Credentials</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Credential type(s) <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {credentialOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    name="credentialTypes"
                    value={opt}
                    onChange={(e) => {
                      setSelectedCreds((prev) =>
                        e.target.checked ? [...prev, opt] : prev.filter((c) => c !== opt)
                      );
                    }}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  {opt}
                </label>
              ))}
            </div>
            <input type="hidden" name="credentialTypes" value="" />
            {state.errors?.credentialTypes && <p className="text-red-500 text-xs mt-1">{state.errors.credentialTypes[0]}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="yearCredentialed" className="block text-sm font-medium text-charcoal mb-1.5">Year credentialed <span className="text-red-500">*</span></label>
              <input id="yearCredentialed" name="yearCredentialed" type="text" placeholder="e.g. 2019" className={inputCls} />
            </div>
            <div>
              <label htmlFor="credentialsActive" className="block text-sm font-medium text-charcoal mb-1.5">Currently active? <span className="text-red-500">*</span></label>
              <select id="credentialsActive" name="credentialsActive" className={selectCls}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label htmlFor="insurance" className="block text-sm font-medium text-charcoal mb-1.5">Prof. liability insurance? <span className="text-red-500">*</span></label>
              <select id="insurance" name="insurance" className={selectCls}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In progress">In progress</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section C — Services */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">C. Services You Offer</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Select the services you can provide <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.length === 0 ? (
                <p className="text-mid-grey text-sm col-span-2">Loading services...</p>
              ) : (
                services.map((s) => (
                  <label key={s.slug} className="flex items-center gap-2 text-sm text-charcoal">
                    <input type="checkbox" name="servicesOffered" value={s.name} className="rounded border-border text-gold focus:ring-gold" />
                    {s.name}
                  </label>
                ))
              )}
            </div>
            <input type="hidden" name="servicesOffered" value="" />
          </div>
          <div>
            <label htmlFor="languages" className="block text-sm font-medium text-charcoal mb-1.5">Languages spoken <span className="text-red-500">*</span></label>
            <input id="languages" name="languages" type="text" placeholder="e.g. English, Punjabi, Hindi" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Section D — Pricing */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">D. Your Rates</h2>
        <p className="text-mid-grey text-sm mb-4">Set your standard rates. You can adjust per-service rates in your partner portal after approval.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstPageRate" className="block text-sm font-medium text-charcoal mb-1.5">
                First page / document rate ($) <span className="text-red-500">*</span>
              </label>
              <input id="firstPageRate" name="firstPageRate" type="number" min="0" step="1" placeholder="e.g. 40" className={inputCls} />
              {state.errors?.firstPageRate && <p className="text-red-500 text-xs mt-1">{state.errors.firstPageRate[0]}</p>}
            </div>
            <div>
              <label htmlFor="additionalPageRate" className="block text-sm font-medium text-charcoal mb-1.5">
                Additional page rate ($) <span className="text-red-500">*</span>
              </label>
              <input id="additionalPageRate" name="additionalPageRate" type="number" min="0" step="1" placeholder="e.g. 15" className={inputCls} />
              {state.errors?.additionalPageRate && <p className="text-red-500 text-xs mt-1">{state.errors.additionalPageRate[0]}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="draftingRate" className="block text-sm font-medium text-charcoal mb-1.5">
              Document drafting rate ($) <span className="text-mid-grey font-normal">(if you offer drafting)</span>
            </label>
            <input id="draftingRate" name="draftingRate" type="number" min="0" step="1" placeholder="e.g. 60" className={inputCls} />
            <p className="text-mid-grey text-xs mt-1">Separate fee for drafting affidavits, declarations, or other documents from scratch.</p>
          </div>
        </div>
      </section>

      {/* Section E — Delivery & Location */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">E. Delivery & Location</h2>
        <div className="space-y-4">
          {/* Mobile service */}
          <div className="rounded-card border border-border p-4 space-y-3">
            <div>
              <label htmlFor="mobileAvailable" className="block text-sm font-medium text-charcoal mb-1.5">
                Do you offer mobile (in-person travel) service? <span className="text-red-500">*</span>
              </label>
              <select
                id="mobileAvailable"
                name="mobileAvailable"
                value={mobileAvail}
                onChange={(e) => setMobileAvail(e.target.value)}
                className={selectCls}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Sometimes">Sometimes / Case-by-case</option>
              </select>
            </div>
            {(mobileAvail === 'Yes' || mobileAvail === 'Sometimes') && (
              <div>
                <label htmlFor="mobileTravelFee" className="block text-sm font-medium text-charcoal mb-1.5">
                  Travel fee ($) <span className="text-mid-grey font-normal">(added on top of service charge)</span>
                </label>
                <input id="mobileTravelFee" name="mobileTravelFee" type="number" min="0" step="1" placeholder="e.g. 25" className={inputCls} />
              </div>
            )}
          </div>

          {/* Virtual service — only for Notary/Solicitor */}
          {showVirtualOption && (
            <div className="rounded-card border border-border p-4">
              <label htmlFor="virtualAvailable" className="block text-sm font-medium text-charcoal mb-1.5">
                Do you offer virtual / remote commissioning?
              </label>
              <select id="virtualAvailable" name="virtualAvailable" className={selectCls}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Planning to">Planning to offer</option>
              </select>
              <p className="text-mid-grey text-xs mt-1.5">Virtual commissioning is available for Notaries Public and Barristers & Solicitors in Alberta.</p>
            </div>
          )}

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-charcoal mb-1.5">
                Your postal code <span className="text-red-500">*</span>
                <span className="text-mid-grey font-normal ml-1">(to match nearby clients)</span>
              </label>
              <input id="postalCode" name="postalCode" type="text" placeholder="T2X 0A1" className={inputCls} />
            </div>
            <div>
              <label htmlFor="serviceRadius" className="block text-sm font-medium text-charcoal mb-1.5">Service radius <span className="text-red-500">*</span></label>
              <select id="serviceRadius" name="serviceRadius" className={selectCls}>
                <option value="">Select</option>
                <option value="5 km">5 km</option>
                <option value="10 km">10 km</option>
                <option value="25 km">25 km</option>
                <option value="City-wide">City-wide</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-card p-3 text-xs text-blue-800">
            <strong>Note:</strong> Availability (days & time slots) will be configured in your partner portal after approval. You can set flexible schedules with multiple time blocks per day.
          </div>
        </div>
      </section>

      {/* Section F — Consents */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">F. Consents</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="confirmAccurate" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>I confirm all information provided in this application is accurate and truthful.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="agreeTerms" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>I agree to the Calgary Oaths <a href="/terms-and-conditions" className="text-gold hover:underline">partner terms and conditions</a>.</span>
          </label>
        </div>
      </section>

      <SubmitButton />
    </form>
  );
}
