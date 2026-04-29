'use client';

import { useState } from 'react';
import { formatCents } from '@/lib/orders/pricing';
import { DecimalInput } from './NumericInput';
import type { PaymentMethod } from '@/lib/orders/types';

interface Props {
  totalCents: number;
  initialMethod?: PaymentMethod | null;
  initialReference?: string | null;
  initialAmountCents?: number | null;
  onRecord: (data: { payment_method: PaymentMethod; payment_reference: string | null; amount_paid_cents: number }) => Promise<void>;
  disabled?: boolean;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function PaymentSection({
  totalCents,
  initialMethod,
  initialReference,
  initialAmountCents,
  onRecord,
  disabled,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>(initialMethod || 'cash');
  const [reference, setReference] = useState(initialReference || '');
  const [amountCents, setAmountCents] = useState<number>(initialAmountCents ?? totalCents);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onRecord({
        payment_method: method,
        payment_reference: reference || null,
        amount_paid_cents: amountCents,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-md bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Total due</span>
        <span className="text-lg font-semibold text-gray-900">{formatCents(totalCents)}</span>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Payment method</label>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                method === m.value
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Receipt #, e-transfer code, last 4 of card"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Amount paid</label>
          <DecimalInput cents={amountCents} onChange={setAmountCents} />
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || saving}
        className="w-full rounded-md bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
      >
        {saving ? 'Recording…' : 'Mark paid'}
      </button>
    </form>
  );
}
