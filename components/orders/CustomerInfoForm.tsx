'use client';

import { useState } from 'react';

export interface CustomerFormValues {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_dob: string;
  customer_address_street: string;
  customer_address_unit: string;
  customer_address_city: string;
  customer_address_province: string;
  customer_address_postal: string;
  customer_address_country: string;
  customer_notes: string;
}

interface Props {
  initial: Partial<CustomerFormValues>;
  onChange: (values: CustomerFormValues) => void;
  large?: boolean;
}

const FIELDS: Array<{ key: keyof CustomerFormValues; label: string; type?: string; placeholder?: string; full?: boolean }> = [
  { key: 'customer_name', label: 'Full legal name (as on ID)', placeholder: 'First Middle Last', full: true },
  { key: 'customer_email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { key: 'customer_phone', label: 'Phone', type: 'tel', placeholder: '(587) 555-0100' },
  { key: 'customer_dob', label: 'Date of birth', type: 'date' },
];

const ADDRESS_FIELDS: Array<{ key: keyof CustomerFormValues; label: string; full?: boolean; placeholder?: string }> = [
  { key: 'customer_address_street', label: 'Street address', full: true, placeholder: '123 Main St NW' },
  { key: 'customer_address_unit', label: 'Unit / Apt (optional)' },
  { key: 'customer_address_city', label: 'City', placeholder: 'Calgary' },
  { key: 'customer_address_province', label: 'Province / State', placeholder: 'AB' },
  { key: 'customer_address_postal', label: 'Postal / ZIP code', placeholder: 'T2P 1J9' },
  { key: 'customer_address_country', label: 'Country', placeholder: 'Canada' },
];

const EMPTY: CustomerFormValues = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_dob: '',
  customer_address_street: '',
  customer_address_unit: '',
  customer_address_city: '',
  customer_address_province: '',
  customer_address_postal: '',
  customer_address_country: 'Canada',
  customer_notes: '',
};

export default function CustomerInfoForm({ initial, onChange, large }: Props) {
  const [values, setValues] = useState<CustomerFormValues>({ ...EMPTY, ...initial });

  function set<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next);
  }

  const inputClass = `w-full rounded-md border border-gray-300 ${large ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'} focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy`;
  const labelClass = `mb-1 block ${large ? 'text-sm' : 'text-xs'} font-medium text-gray-700`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Your information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
              <label className={labelClass}>{f.label}</label>
              <input
                type={f.type || 'text'}
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputClass}
                autoComplete={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'on'}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ADDRESS_FIELDS.map((f) => (
            <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
              <label className={labelClass}>{f.label}</label>
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Special instructions / notes</label>
        <textarea
          value={values.customer_notes}
          onChange={(e) => set('customer_notes', e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Anything we should know to complete your order"
        />
      </div>
    </div>
  );
}
