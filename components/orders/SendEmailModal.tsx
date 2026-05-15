'use client';

import { useState } from 'react';
import { Mail, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (include: { invoice: boolean; terms: boolean }) => Promise<void>;
  customerEmail: string;
  hasSignedTerms: boolean;
}

export default function SendEmailModal({ open, onClose, onSend, customerEmail, hasSignedTerms }: Props) {
  const [includeInvoice, setIncludeInvoice] = useState(true);
  const [includeTerms, setIncludeTerms] = useState(hasSignedTerms);
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const canSend = includeInvoice || (hasSignedTerms && includeTerms);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend({ invoice: includeInvoice, terms: hasSignedTerms && includeTerms });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Mail className="h-4 w-4" /> Email to customer
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 break-all">To: {customerEmail}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-xs text-gray-600">Choose what to attach:</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={includeInvoice}
              onChange={(e) => setIncludeInvoice(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Invoice (PDF)</p>
              <p className="text-xs text-gray-500">Itemized invoice with tax breakdown and payment status.</p>
            </div>
          </label>
          <label className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${hasSignedTerms ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50'}`}>
            <input
              type="checkbox"
              disabled={!hasSignedTerms}
              checked={hasSignedTerms && includeTerms}
              onChange={(e) => setIncludeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Signed terms & conditions (PDF)</p>
              <p className="text-xs text-gray-500">
                {hasSignedTerms
                  ? 'The exact T&C version the customer signed, with their signature.'
                  : 'Not available — customer has not signed yet.'}
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sending}
            className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
