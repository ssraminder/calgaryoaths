'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitContactForm } from '@/app/actions/contact';

const serviceOptions = [
  'Affidavit',
  'Statutory Declaration',
  'Travel Consent Letter',
  'Invitation Letter (IRCC)',
  'Apostille / Legalization',
  'Mobile Service',
  'Other',
];

const locationOptions = [
  'Downtown Calgary — Raminder Shah',
  'NE Calgary — Amrita Shah',
  'Mobile (come to me)',
  'No preference',
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full justify-center py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Sending...' : 'Send Message'}
    </button>
  );
}

export default function ContactForm() {
  const [state, action] = useFormState(submitContactForm, { success: false, message: '' });

  if (state.success) {
    return (
      <div className="bg-teal/10 border border-teal/30 rounded-card p-6 text-center">
        <p className="text-teal font-medium text-lg">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Honeypot */}
      <input type="text" name="honeypot" className="hidden" tabIndex={-1} aria-hidden="true" />

      {state.message && !state.success && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-red-700 text-sm">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1.5">Name <span className="text-red-500">*</span></label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
            placeholder="Your full name"
          />
          {state.errors?.name && <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-1.5">Phone <span className="text-red-500">*</span></label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
            placeholder="(587) 000-0000"
          />
          {state.errors?.phone && <p className="text-red-500 text-xs mt-1">{state.errors.phone[0]}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">Email <span className="text-red-500">*</span></label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
          placeholder="you@example.com"
        />
        {state.errors?.email && <p className="text-red-500 text-xs mt-1">{state.errors.email[0]}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-charcoal mb-1.5">Service needed <span className="text-red-500">*</span></label>
          <select
            id="service"
            name="service"
            required
            className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
          >
            <option value="">Select a service</option>
            {serviceOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {state.errors?.service && <p className="text-red-500 text-xs mt-1">{state.errors.service[0]}</p>}
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-charcoal mb-1.5">Preferred location <span className="text-red-500">*</span></label>
          <select
            id="location"
            name="location"
            required
            className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
          >
            <option value="">Select preference</option>
            {locationOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {state.errors?.location && <p className="text-red-500 text-xs mt-1">{state.errors.location[0]}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-charcoal mb-1.5">Message (optional)</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-btn bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm resize-y"
          placeholder="Any additional details or questions..."
        />
      </div>

      <SubmitButton />
    </form>
  );
}
