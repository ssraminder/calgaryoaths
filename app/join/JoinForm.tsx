'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitJoinForm } from '@/app/actions/join';

const daySlots = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const timeSlots = ['Morning', 'Afternoon', 'Evening'];
const serviceOptions = [
  'Affidavit Drafting & Commissioning',
  'Statutory Declarations',
  'Travel Consent Letters',
  'Invitation Letters (IRCC)',
  'Apostille & Legalization',
  'Mobile Service',
];
const credentialOptions = ['Commissioner of Oaths', 'Notary Public', 'Barrister & Solicitor'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full justify-center py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Submitting...' : 'Submit Application'}
    </button>
  );
}

export default function JoinForm() {
  const [state, action] = useFormState(submitJoinForm, { success: false, message: '' });

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
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-red-700 text-sm">
          {state.message}
        </div>
      )}

      {/* Section A — Personal */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">
          A. Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-charcoal mb-1.5">Full legal name <span className="text-red-500">*</span></label>
            <input id="fullName" name="fullName" type="text" required className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            {state.errors?.fullName && <p className="text-red-500 text-xs mt-1">{state.errors.fullName[0]}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">Email <span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" required className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            {state.errors?.email && <p className="text-red-500 text-xs mt-1">{state.errors.email[0]}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-1.5">Phone <span className="text-red-500">*</span></label>
            <input id="phone" name="phone" type="tel" required className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            {state.errors?.phone && <p className="text-red-500 text-xs mt-1">{state.errors.phone[0]}</p>}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-charcoal mb-1.5">City <span className="text-red-500">*</span></label>
            <input id="city" name="city" type="text" required className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
          </div>
        </div>
      </section>

      {/* Section B — Credentials */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">
          B. Credentials
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Credential type(s) <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {credentialOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-charcoal">
                  <input type="checkbox" name="credentialTypes" value={opt} className="rounded border-border text-gold focus:ring-gold" />
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
              <input id="yearCredentialed" name="yearCredentialed" type="text" placeholder="e.g. 2019" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            </div>
            <div>
              <label htmlFor="credentialsActive" className="block text-sm font-medium text-charcoal mb-1.5">Currently active? <span className="text-red-500">*</span></label>
              <select id="credentialsActive" name="credentialsActive" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label htmlFor="insurance" className="block text-sm font-medium text-charcoal mb-1.5">Prof. liability insurance? <span className="text-red-500">*</span></label>
              <select id="insurance" name="insurance" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold">
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
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">
          C. Services
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Services you offer <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {serviceOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-charcoal">
                  <input type="checkbox" name="servicesOffered" value={opt} className="rounded border-border text-gold focus:ring-gold" />
                  {opt}
                </label>
              ))}
            </div>
            <input type="hidden" name="servicesOffered" value="" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mobileAvailable" className="block text-sm font-medium text-charcoal mb-1.5">Mobile service available? <span className="text-red-500">*</span></label>
              <select id="mobileAvailable" name="mobileAvailable" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Sometimes">Sometimes</option>
              </select>
            </div>
            <div>
              <label htmlFor="languages" className="block text-sm font-medium text-charcoal mb-1.5">Languages spoken <span className="text-red-500">*</span></label>
              <input id="languages" name="languages" type="text" placeholder="e.g. English, Punjabi" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            </div>
          </div>
        </div>
      </section>

      {/* Section D — Location */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">
          D. Location & Availability
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-charcoal mb-1.5">
                Your postal code <span className="text-red-500">*</span>
                <span className="text-mid-grey font-normal ml-1">(used to match you with nearby clients)</span>
              </label>
              <input id="postalCode" name="postalCode" type="text" placeholder="T2X 0A1" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
            </div>
            <div>
              <label htmlFor="serviceRadius" className="block text-sm font-medium text-charcoal mb-1.5">Service radius <span className="text-red-500">*</span></label>
              <select id="serviceRadius" name="serviceRadius" className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                <option value="">Select</option>
                <option value="5 km">5 km</option>
                <option value="10 km">10 km</option>
                <option value="25 km">25 km</option>
                <option value="City-wide">City-wide</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Availability <span className="text-red-500">*</span></label>
            <input type="hidden" name="availability" value="See below" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-btn">
                <thead>
                  <tr className="bg-bg">
                    <th className="p-2 text-left text-mid-grey font-medium"></th>
                    {timeSlots.map((t) => <th key={t} className="p-2 text-center text-mid-grey font-medium">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {daySlots.map((day) => (
                    <tr key={day} className="border-t border-border">
                      <td className="p-2 font-medium text-charcoal">{day}</td>
                      {timeSlots.map((time) => (
                        <td key={time} className="p-2 text-center">
                          <input type="checkbox" name={`avail_${day}_${time}`} value={`${day} ${time}`} className="rounded border-border text-gold focus:ring-gold" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section E — Consents */}
      <section>
        <h2 className="font-display font-semibold text-lg text-charcoal mb-4 pb-2 border-b border-border">
          E. Consents
        </h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="confirmAccurate" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>I confirm all information provided in this application is accurate and truthful.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="agreeTerms" value="true" required className="mt-0.5 rounded border-border text-gold focus:ring-gold flex-shrink-0" />
            <span>
              I agree to the Calgary Oaths{' '}
              <a href="/terms-and-conditions" className="text-gold hover:underline">partner terms and conditions</a>.
            </span>
          </label>
        </div>
      </section>

      <SubmitButton />
    </form>
  );
}
