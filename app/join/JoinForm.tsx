'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitJoinForm } from '@/app/actions/join';
import TagInput from '@/components/shared/TagInput';

const credentialOptions = ['Commissioner of Oaths', 'Notary Public', 'Barrister & Solicitor'];

const LANGUAGE_SUGGESTIONS = [
  'English', 'Punjabi', 'Hindi', 'Gujarati', 'Urdu', 'Arabic', 'French',
  'Spanish', 'Mandarin', 'Cantonese', 'Tagalog', 'Korean', 'Vietnamese',
  'Farsi', 'Turkish', 'Somali', 'Amharic', 'Tigrinya',
];

const NEIGHBOURHOOD_SUGGESTIONS = [
  'Beltline', '17th Ave SW', 'Mission', 'Cliff Bungalow', 'Victoria Park',
  'Downtown Core', 'Downtown Calgary', 'South Calgary', 'Sunalta', 'Bankview',
  'Redstone', 'Cornerstone', 'Cityscape', 'Country Hills', 'Saddle Ridge',
  'Falconridge', 'Taradale', 'NE Calgary', 'Martindale', 'Pineridge',
  'Rundle', 'Temple', 'Castleridge', 'Bridgeland', 'Kensington',
  'Marda Loop', 'Inglewood', 'Ramsay', 'Airdrie', 'Cochrane', 'Chestermere',
  'Panorama Hills', 'Evanston', 'Nolan Hill', 'Sage Hill', 'Coventry Hills',
  'Cranston', 'Auburn Bay', 'Mahogany', 'McKenzie Towne', 'New Brighton',
  'Seton', 'Copperfield', 'Chaparral', 'Shawnessy', 'Evergreen',
];

const inputCls = 'w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold';
const selectCls = inputCls;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed">
      {pending ? 'Creating your account...' : 'Submit Application & Create Account'}
    </button>
  );
}

type Service = { slug: string; name: string };

export default function JoinForm() {
  const [state, action] = useFormState(submitJoinForm, { success: false, message: '' });
  const [services, setServices] = useState<Service[]>([]);
  const [mobileAvail, setMobileAvail] = useState('');
  const [selectedCreds, setSelectedCreds] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [areas, setAreas] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/booking/services')
      .then((r) => r.json())
      .then((data) => {
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
      <div className="bg-teal/10 border border-teal/30 rounded-card p-8 text-center space-y-3">
        <p className="text-teal font-display font-semibold text-xl">Application received!</p>
        <p className="text-charcoal">{state.message}</p>
        <p className="text-mid-grey text-sm">You can log in to the partner portal once your application is approved.</p>
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
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-charcoal mb-1.5">Full legal name <span className="text-red-500">*</span></label>
            <input id="fullName" name="fullName" type="text" required className={inputCls} />
            {state.errors?.fullName && <p className="text-red-500 text-xs mt-1">{state.errors.fullName[0]}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">Email <span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" required className={inputCls} />
            <p className="text-mid-grey text-xs mt-1">This will be your login email for the partner portal.</p>
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
        </div>
      </section>

      {/* Section B — Account Password */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Partner Portal Account</h2>
        <p className="text-mid-grey text-sm mb-4">Create your login credentials. You&apos;ll use these to access the partner portal after approval.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1.5">Password <span className="text-red-500">*</span></label>
            <input id="password" name="password" type="password" required minLength={8} placeholder="Min 8 characters" className={inputCls} />
            {state.errors?.password && <p className="text-red-500 text-xs mt-1">{state.errors.password[0]}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal mb-1.5">Confirm password <span className="text-red-500">*</span></label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className={inputCls} />
            {state.errors?.confirmPassword && <p className="text-red-500 text-xs mt-1">{state.errors.confirmPassword[0]}</p>}
          </div>
        </div>
      </section>

      {/* Section C — Credentials */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Credentials</h2>
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
              <label htmlFor="insurance" className="block text-sm font-medium text-charcoal mb-1.5">Liability insurance? <span className="text-red-500">*</span></label>
              <select id="insurance" name="insurance" className={selectCls}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In progress">In progress</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="credentialFile" className="block text-sm font-medium text-charcoal mb-1.5">
              Upload credential certificate <span className="text-red-500">*</span>
            </label>
            <input
              id="credentialFile"
              name="credentialFile"
              type="file"
              accept="image/*,.pdf"
              required
              className="w-full text-sm text-charcoal file:mr-4 file:py-2 file:px-4 file:rounded-btn file:border file:border-border file:text-sm file:font-medium file:bg-white file:text-charcoal hover:file:bg-bg file:cursor-pointer"
            />
            <p className="text-mid-grey text-xs mt-1">Scan or photo of your Commissioner of Oaths certificate, Notary Public appointment, or law society card. (PDF, JPG, PNG — max 10MB)</p>
          </div>
        </div>
      </section>

      {/* Section D — Services & Languages */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Services & Languages</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Services you can provide <span className="text-red-500">*</span></label>
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
          <TagInput
            name="languages"
            label="Languages spoken"
            value={languages}
            onChange={setLanguages}
            suggestions={LANGUAGE_SUGGESTIONS}
            placeholder="Add language..."
          />
          <input type="hidden" name="languagesJson" value={JSON.stringify(languages)} />
        </div>
      </section>

      {/* Section E — Delivery & Coverage */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Delivery & Coverage Area</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-card border border-border p-4">
              <label htmlFor="mobileAvailable" className="block text-sm font-medium text-charcoal mb-1.5">
                Offer mobile (travel to client)?
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
                <option value="Sometimes">Case-by-case</option>
              </select>
            </div>

            {showVirtualOption ? (
              <div className="rounded-card border border-border p-4">
                <label htmlFor="virtualAvailable" className="block text-sm font-medium text-charcoal mb-1.5">
                  Offer virtual commissioning?
                </label>
                <select id="virtualAvailable" name="virtualAvailable" className={selectCls}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            ) : (
              <div className="rounded-card border border-border p-4 opacity-50">
                <p className="text-sm font-medium text-charcoal mb-1.5">Virtual commissioning</p>
                <p className="text-xs text-mid-grey">Available for Notaries Public and Barristers & Solicitors only.</p>
              </div>
            )}
          </div>

          <TagInput
            name="areasServed"
            label="Areas you serve"
            value={areas}
            onChange={setAreas}
            suggestions={NEIGHBOURHOOD_SUGGESTIONS}
            placeholder="Add neighbourhood or area..."
          />
          <input type="hidden" name="areasServedJson" value={JSON.stringify(areas)} />
        </div>
      </section>

      {/* Section F — GST/HST */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">GST/HST Registration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gstNumber" className="block text-sm font-medium text-charcoal mb-1.5">GST/HST number <span className="text-mid-grey font-normal">(if registered)</span></label>
            <input id="gstNumber" name="gstNumber" type="text" placeholder="e.g. 123456789RT0001" className={inputCls} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input type="checkbox" name="gstRegistered" value="true" className="rounded border-border text-gold focus:ring-gold" />
              I am GST/HST registered
            </label>
          </div>
        </div>
        <p className="text-mid-grey text-xs mt-2">If registered, 5% GST will be added to your payouts.</p>
      </section>

      {/* Section G — How did you hear */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">Additional</h2>
        <div>
          <label htmlFor="referralSource" className="block text-sm font-medium text-charcoal mb-1.5">How did you hear about us?</label>
          <select id="referralSource" name="referralSource" className={selectCls}>
            <option value="">Select</option>
            <option value="Google Search">Google Search</option>
            <option value="Social Media">Social Media</option>
            <option value="Referral">Referral from someone</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </section>

      {/* Section H — Consents */}
      <section>
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="confirmAccurate" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>I confirm all information provided is accurate and truthful.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="agreeTerms" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>I agree to the Calgary Oaths <a href="/terms-and-conditions" className="text-gold hover:underline">partner terms and conditions</a>.</span>
          </label>
        </div>
      </section>

      <SubmitButton />

      <p className="text-center text-xs text-mid-grey">
        Rates and availability are configured in your partner portal after approval.
      </p>
    </form>
  );
}
