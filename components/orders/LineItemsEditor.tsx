'use client';

import { Plus, Trash2 } from 'lucide-react';
import { lineTotalCents, formatCents } from '@/lib/orders/pricing';
import type { OrderItem, OrderType } from '@/lib/orders/types';

interface Props {
  orderType: OrderType;
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

const APO_DOC_TYPES = [
  'Birth Certificate',
  'Marriage Certificate',
  'Death Certificate',
  'Diploma / Transcript',
  'Criminal Record Check',
  'Corporate Documents (Articles, Certificate of Incorporation, etc.)',
  'Power of Attorney',
  'Affidavit',
  'Translation',
  'Other',
];

const NOT_DOC_TYPES = [
  'Affidavit',
  'Statutory Declaration',
  'True Copy Certification',
  'Witnessing of Signature - Will',
  'Witnessing of Signature - Power of Attorney',
  'Witnessing of Signature - Personal Directive',
  'Witnessing of Signature - Trust',
  'Witnessing of Signature - Other',
  'Travel Consent Letter',
  'Consent to Travel for Minor',
  'Identity Verification',
  'Other',
];

function blankItem(position: number): OrderItem {
  return {
    position,
    item_type: null,
    description: '',
    quantity: 1,
    unit_price_cents: 0,
    gov_fee_cents: 0,
    notes: null,
    line_total_cents: 0,
  };
}

export default function LineItemsEditor({ orderType, items, onChange }: Props) {
  const docOptions = orderType === 'apostille' ? APO_DOC_TYPES : NOT_DOC_TYPES;
  const showGovFee = orderType === 'apostille';

  function update(idx: number, patch: Partial<OrderItem>) {
    const next = items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.line_total_cents = lineTotalCents(merged);
      return merged;
    });
    onChange(next);
  }

  function addRow() {
    onChange([...items, blankItem(items.length)]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, position: i })));
  }

  const subtotal = items.reduce((s, it) => s + lineTotalCents(it), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Line items</h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          No items yet. Tap "Add item" to begin.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-md border border-gray-200 p-3 space-y-2 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4">
                  <label className="block text-xs text-gray-500 mb-1">Document / service</label>
                  <select
                    value={item.item_type || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      update(idx, {
                        item_type: v || null,
                        description: item.description || (v && v !== 'Other' ? v : item.description),
                      });
                    }}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {docOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="e.g., Birth certificate for John Doe"
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => update(idx, { quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Unit price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={(item.unit_price_cents / 100).toFixed(2)}
                    onChange={(e) => update(idx, { unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                </div>
                {showGovFee && (
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Gov fee</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={((item.gov_fee_cents || 0) / 100).toFixed(2)}
                      onChange={(e) => update(idx, { gov_fee_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                      className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => update(idx, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="flex-1 mr-2 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                />
                <span className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
                  {formatCents(lineTotalCents(item))}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end pt-2 border-t border-gray-200">
        <span className="text-sm text-gray-500 mr-2">Items subtotal:</span>
        <span className="text-sm font-semibold text-gray-900">{formatCents(subtotal)}</span>
      </div>
    </div>
  );
}
