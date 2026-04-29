'use client';

import { useEffect, useState } from 'react';
import type { TaxRateRow } from '@/lib/orders/pricing';
import { buildTaxLabel } from '@/lib/orders/pricing';

interface Props {
  value: string;
  onChange: (provinceCode: string, rate: TaxRateRow) => void;
  /** Pre-loaded rates (optional — will fetch if omitted) */
  rates?: TaxRateRow[];
}

export default function TaxProvinceSelect({ value, onChange, rates: initialRates }: Props) {
  const [rates, setRates] = useState<TaxRateRow[]>(initialRates || []);
  const [loading, setLoading] = useState(!initialRates);

  useEffect(() => {
    if (initialRates && initialRates.length > 0) return;
    let cancelled = false;
    fetch('/api/orders/tax-rates')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled) return;
        if (d?.taxRates) setRates(d.taxRates);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialRates]);

  function handleChange(code: string) {
    const row = rates.find((r) => r.province_code === code);
    if (row) onChange(code, row);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">Tax jurisdiction</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:opacity-50"
      >
        {loading && <option>Loading…</option>}
        {!loading && rates.map((r) => {
          const gst = typeof r.gst_rate === 'number' ? r.gst_rate : parseFloat(String(r.gst_rate));
          const pst = typeof r.pst_rate === 'number' ? r.pst_rate : parseFloat(String(r.pst_rate));
          const hst = typeof r.hst_rate === 'number' ? r.hst_rate : parseFloat(String(r.hst_rate));
          const total = typeof r.total_rate === 'number' ? r.total_rate : parseFloat(String(r.total_rate));
          const label = buildTaxLabel({ gst_rate: gst, pst_rate: pst, hst_rate: hst, total_rate: total });
          return (
            <option key={r.province_code} value={r.province_code}>
              {r.province_name} — {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
