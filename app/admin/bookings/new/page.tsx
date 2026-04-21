'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Copy } from 'lucide-react';

type Service = { slug: string; name: string; active: boolean };
type Vendor = {
  id: string;
  name: string;
  co_commissioner_services?: { service_slug: string }[];
};

export default function AdminNewBookingPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [serviceSlug, setServiceSlug] = useState('');
  const [commissionerId, setCommissionerId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [numDocuments, setNumDocuments] = useState(1);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ bookingId: string; checkoutUrl: string; totalChargedCents: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/services').then((r) => r.json()),
      fetch('/api/admin/vendors').then((r) => r.json()),
    ])
      .then(([s, v]) => {
        setServices(((s as Service[]) || []).filter((x) => x.active));
        setVendors(v || []);
        setLoadingLookups(false);
      })
      .catch(() => setLoadingLookups(false));
  }, []);

  // Only show vendors that offer the selected service
  const eligibleVendors = serviceSlug
    ? vendors.filter((v) => v.co_commissioner_services?.some((l) => l.service_slug === serviceSlug))
    : vendors;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const appointment_datetime = new Date(`${date}T${time}:00`).toISOString();
    try {
      const res = await fetch('/api/admin/bookings/create-for-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_slug: serviceSlug,
          commissioner_id: commissionerId,
          name,
          email,
          phone,
          num_documents: numDocuments,
          notes,
          appointment_datetime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create booking');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Booking created — payment link sent</h2>
          </div>
          <p className="text-sm text-gray-700">
            A payment link has been emailed to <strong>{email}</strong>. The booking is held pending payment.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Total:</strong> ${(result.totalChargedCents / 100).toFixed(2)} CAD
          </p>
          <div className="rounded-md border border-green-300 bg-white p-3 space-y-2">
            <p className="text-xs font-medium text-gray-500">Payment link (also in the email)</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={result.checkoutUrl}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs font-mono"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.checkoutUrl)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/bookings/${result.bookingId}`)}
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
            >
              View Booking
            </button>
            <button
              onClick={() => router.push('/admin/bookings')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => router.push('/admin/bookings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New Booking on Behalf of Customer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create an in-office booking. The customer will receive a Stripe payment link by email to confirm.
        </p>
      </div>

      {loadingLookups ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service" required>
              <select
                value={serviceSlug}
                onChange={(e) => { setServiceSlug(e.target.value); setCommissionerId(''); }}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select a service...</option>
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Commissioner" required>
              <select
                value={commissionerId}
                onChange={(e) => setCommissionerId(e.target.value)}
                required
                disabled={!serviceSlug}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="">
                  {serviceSlug ? 'Select a commissioner...' : 'Select a service first'}
                </option>
                {eligibleVendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Time" required>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-900">Customer Details</h3>
            <div className="space-y-4">
              <Field label="Full name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Phone" required>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <Field label="Number of documents">
                <input
                  type="number"
                  min={1}
                  value={numDocuments}
                  onChange={(e) => setNumDocuments(parseInt(e.target.value || '1', 10))}
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Notes (optional)">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Any context to share with the vendor..."
                />
              </Field>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/bookings')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Booking & Send Payment Link'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
