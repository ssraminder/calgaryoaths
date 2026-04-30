'use client';

import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import CustomerInfoForm, { type CustomerFormValues } from './CustomerInfoForm';
import TermsAcceptance from './TermsAcceptance';
import SignaturePad from './SignaturePad';
import { formatCents } from '@/lib/orders/pricing';

interface OrderSummary {
  order_number: string;
  order_type: 'apostille' | 'notarization';
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address_street?: string | null;
  customer_address_unit?: string | null;
  customer_address_city?: string | null;
  customer_address_province?: string | null;
  customer_address_postal?: string | null;
  customer_address_country?: string | null;
  customer_notes?: string | null;
}

interface ItemSummary {
  description: string;
  quantity: number;
  line_total_cents: number;
}

interface TermsRecord {
  id: string;
  form_type: string;
  version: string;
  content_md: string;
}

interface Props {
  token: string;
  order: OrderSummary;
  items: ItemSummary[];
  terms: TermsRecord;
  returnUrl?: string | null;
}

export default function CustomerOrderForm({ token, order, items, terms, returnUrl }: Props) {
  const [customer, setCustomer] = useState<CustomerFormValues>({
    customer_name: order.customer_name || '',
    customer_email: order.customer_email || '',
    customer_phone: order.customer_phone || '',
    customer_address_street: order.customer_address_street || '',
    customer_address_unit: order.customer_address_unit || '',
    customer_address_city: order.customer_address_city || '',
    customer_address_province: order.customer_address_province || '',
    customer_address_postal: order.customer_address_postal || '',
    customer_address_country: order.customer_address_country || 'Canada',
    customer_notes: order.customer_notes || '',
  });
  const [accepted, setAccepted] = useState(false);
  const [termsId, setTermsId] = useState<string | null>(terms.id);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (customer.customer_name.trim().length <= 1) missing.push('Full legal name');
    if (!/\S+@\S+\.\S+/.test(customer.customer_email)) missing.push('Email');
    if (customer.customer_phone.trim().length === 0) missing.push('Phone');
    if (customer.customer_address_street.trim().length === 0) missing.push('Street address');
    if (customer.customer_address_city.trim().length === 0) missing.push('City');
    if (customer.customer_address_province.trim().length === 0) missing.push('Province / State');
    if (customer.customer_address_postal.trim().length === 0) missing.push('Postal / ZIP code');
    if (customer.customer_address_country.trim().length === 0) missing.push('Country');
    if (!accepted || !termsId) missing.push('Terms acceptance');
    if (!signature) missing.push('Signature');
    return missing;
  }, [customer, accepted, termsId, signature]);

  const canSubmit = missingFields.length === 0;

  async function submit() {
    if (!canSubmit || !signature || !termsId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/customer/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customer,
          terms_version_id: termsId,
          signature_data_url: signature,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Submit failed');
      }
      const next = returnUrl ? returnUrl : `/orders/c/${token}/done`;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <header className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider text-gray-500">Order #{order.order_number}</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">
          {order.order_type === 'apostille' ? 'Apostille / Authentication order' : 'Notarization / Oath Commissioner order'}
        </h1>
        {items.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{it.description} {it.quantity > 1 && <span className="text-gray-400">× {it.quantity}</span>}</span>
                <span>{formatCents(it.line_total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-gray-200 pt-2 flex justify-between text-sm">
          <span className="text-gray-500">Total (incl. GST)</span>
          <span className="font-semibold">{formatCents(order.total_cents)}</span>
        </div>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
        <CustomerInfoForm initial={customer} onChange={setCustomer} large />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Terms &amp; conditions</h2>
        <TermsAcceptance
          formType={order.order_type}
          initialTerms={terms}
          accepted={accepted}
          onChange={(a, id) => { setAccepted(a); setTermsId(id); }}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Signature</h2>
        <SignaturePad onChange={setSignature} />
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {!canSubmit && (
        <p className="text-center text-sm text-gray-600">
          Please complete: <span className="font-medium text-gray-800">{missingFields.join(', ')}</span>
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-navy py-3 text-base font-medium text-white hover:bg-navy/90 disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
        {submitting ? 'Submitting…' : 'Submit and hand back to staff'}
      </button>
    </div>
  );
}
