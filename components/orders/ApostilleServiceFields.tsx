'use client';

import type { Order } from '@/lib/orders/types';
import { IntegerInput } from './NumericInput';

export interface ApostilleFieldsValues {
  destination_country: string;
  authentication_type: 'apostille' | 'authentication_legalization' | 'both' | '';
  notarization_required: boolean;
  translation_required: boolean;
  translation_language: string;
  delivery_method: 'pickup' | 'courier' | '';
  expedited: boolean;
  estimated_turnaround_days: number | '';
  notes_internal: string;
}

interface Props {
  values: ApostilleFieldsValues;
  onChange: (values: ApostilleFieldsValues) => void;
}

export function apostileInitialFromOrder(o: Pick<Order, 'destination_country' | 'authentication_type' | 'notarization_required' | 'translation_required' | 'translation_language' | 'delivery_method' | 'expedited' | 'estimated_turnaround_days' | 'notes_internal'>): ApostilleFieldsValues {
  return {
    destination_country: o.destination_country || '',
    authentication_type: (o.authentication_type as ApostilleFieldsValues['authentication_type']) || '',
    notarization_required: !!o.notarization_required,
    translation_required: !!o.translation_required,
    translation_language: o.translation_language || '',
    delivery_method: (o.delivery_method as ApostilleFieldsValues['delivery_method']) || '',
    expedited: !!o.expedited,
    estimated_turnaround_days: o.estimated_turnaround_days ?? '',
    notes_internal: o.notes_internal || '',
  };
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
const labelClass = 'mb-1 block text-xs font-medium text-gray-700';

export default function ApostilleServiceFields({ values, onChange }: Props) {
  function set<K extends keyof ApostilleFieldsValues>(key: K, value: ApostilleFieldsValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Destination country</label>
          <input
            type="text"
            value={values.destination_country}
            onChange={(e) => set('destination_country', e.target.value)}
            placeholder="e.g., Spain"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Authentication type</label>
          <select
            value={values.authentication_type}
            onChange={(e) => set('authentication_type', e.target.value as ApostilleFieldsValues['authentication_type'])}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="apostille">Apostille (Hague Convention)</option>
            <option value="authentication_legalization">Authentication + Legalization</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Delivery method</label>
          <select
            value={values.delivery_method}
            onChange={(e) => set('delivery_method', e.target.value as ApostilleFieldsValues['delivery_method'])}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="pickup">Customer pickup</option>
            <option value="courier">Courier</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Estimated turnaround (days)</label>
          <IntegerInput
            value={values.estimated_turnaround_days === '' ? null : values.estimated_turnaround_days}
            min={0}
            onChange={(n) => set('estimated_turnaround_days', n)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={values.expedited}
            onChange={(e) => set('expedited', e.target.checked)}
            className="h-4 w-4 rounded text-navy"
          />
          <span className="text-sm text-gray-700">Expedited / rush</span>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={values.notarization_required}
            onChange={(e) => set('notarization_required', e.target.checked)}
            className="h-4 w-4 rounded text-navy"
          />
          <span className="text-sm text-gray-700">Notarization required first</span>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={values.translation_required}
            onChange={(e) => set('translation_required', e.target.checked)}
            className="h-4 w-4 rounded text-navy"
          />
          <span className="text-sm text-gray-700">Translation required</span>
        </label>
      </div>

      {values.translation_required && (
        <div>
          <label className={labelClass}>Translation language</label>
          <input
            type="text"
            value={values.translation_language}
            onChange={(e) => set('translation_language', e.target.value)}
            placeholder="e.g., Spanish"
            className={inputClass}
          />
        </div>
      )}

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
