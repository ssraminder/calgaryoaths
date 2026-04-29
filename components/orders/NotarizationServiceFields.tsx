'use client';

import { useEffect, useState } from 'react';
import type { Order } from '@/lib/orders/types';

const SUBTYPES = [
  'Affidavit',
  'Statutory Declaration',
  'True Copy Certification',
  'Witnessing Signature - Will',
  'Witnessing Signature - Power of Attorney',
  'Witnessing Signature - Personal Directive',
  'Witnessing Signature - Trust',
  'Witnessing Signature - Other',
  'Travel Consent Letter',
  'Consent to Travel for Minor',
  'Identity Verification',
  'Other',
];

export interface NotarizationFieldsValues {
  service_role: 'notary' | 'oath_commissioner' | '';
  performed_by_commissioner_id: string;
  service_subtypes: string[];
  delivery_mode: 'in_office' | 'mobile' | 'virtual' | '';
  mobile_address: string;
  travel_fee_cents: number;
  expedited: boolean;
  estimated_turnaround_days: number | '';
  notes_internal: string;
}

interface Props {
  values: NotarizationFieldsValues;
  onChange: (values: NotarizationFieldsValues) => void;
}

export function notarizationInitialFromOrder(o: Pick<Order, 'service_role' | 'performed_by_commissioner_id' | 'service_subtypes' | 'delivery_mode' | 'mobile_address' | 'travel_fee_cents' | 'expedited' | 'estimated_turnaround_days' | 'notes_internal'>): NotarizationFieldsValues {
  return {
    service_role: (o.service_role as NotarizationFieldsValues['service_role']) || '',
    performed_by_commissioner_id: o.performed_by_commissioner_id || '',
    service_subtypes: o.service_subtypes || [],
    delivery_mode: (o.delivery_mode as NotarizationFieldsValues['delivery_mode']) || '',
    mobile_address: o.mobile_address || '',
    travel_fee_cents: o.travel_fee_cents || 0,
    expedited: !!o.expedited,
    estimated_turnaround_days: o.estimated_turnaround_days ?? '',
    notes_internal: o.notes_internal || '',
  };
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
const labelClass = 'mb-1 block text-xs font-medium text-gray-700';

export default function NotarizationServiceFields({ values, onChange }: Props) {
  const [commissioners, setCommissioners] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch('/api/orders/commissioners')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.commissioners) setCommissioners(d.commissioners); })
      .catch(() => {});
  }, []);

  function set<K extends keyof NotarizationFieldsValues>(key: K, value: NotarizationFieldsValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function toggleSubtype(s: string) {
    const next = values.service_subtypes.includes(s)
      ? values.service_subtypes.filter((x) => x !== s)
      : [...values.service_subtypes, s];
    set('service_subtypes', next);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Service role</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'notary', label: 'Notary Public' },
            { v: 'oath_commissioner', label: 'Commissioner of Oaths' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => set('service_role', o.v as NotarizationFieldsValues['service_role'])}
              className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
                values.service_role === o.v
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Performed by</label>
        <select
          value={values.performed_by_commissioner_id}
          onChange={(e) => set('performed_by_commissioner_id', e.target.value)}
          className={inputClass}
        >
          <option value="">Select practitioner…</option>
          {commissioners.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Service subtypes</label>
        <div className="flex flex-wrap gap-2">
          {SUBTYPES.map((s) => {
            const active = values.service_subtypes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSubtype(s)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Delivery mode</label>
          <select
            value={values.delivery_mode}
            onChange={(e) => set('delivery_mode', e.target.value as NotarizationFieldsValues['delivery_mode'])}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="in_office">In office</option>
            <option value="mobile">Mobile (we travel)</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Estimated turnaround (days)</label>
          <input
            type="number"
            min={0}
            value={values.estimated_turnaround_days === '' ? '' : values.estimated_turnaround_days}
            onChange={(e) => set('estimated_turnaround_days', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
            className={inputClass}
          />
        </div>
      </div>

      {values.delivery_mode === 'mobile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelClass}>Mobile address</label>
            <input
              type="text"
              value={values.mobile_address}
              onChange={(e) => set('mobile_address', e.target.value)}
              className={inputClass}
              placeholder="Where will the service take place?"
            />
          </div>
          <div>
            <label className={labelClass}>Travel fee ($)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={(values.travel_fee_cents / 100).toFixed(2)}
              onChange={(e) => set('travel_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2.5 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={values.expedited}
          onChange={(e) => set('expedited', e.target.checked)}
          className="h-4 w-4 rounded text-navy"
        />
        <span className="text-sm text-gray-700">Expedited / rush</span>
      </label>

      <div>
        <label className={labelClass}>Internal notes</label>
        <textarea
          rows={3}
          value={values.notes_internal}
          onChange={(e) => set('notes_internal', e.target.value)}
          placeholder="Notes for staff (not shown to customer)"
          className={inputClass}
        />
      </div>
    </div>
  );
}
