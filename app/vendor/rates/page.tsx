'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';

type VendorRate = {
  service_slug: string;
  service_name: string;
  service_price: number | null;
  service_price_label: string;
  min_vendor_rate_cents: number | null;
  suggested_first_page_cents: number | null;
  suggested_additional_page_cents: number;
  first_page_cents: number | null;
  additional_page_cents: number;
  is_saved: boolean;
};

export default function VendorRatesPage() {
  const [rates, setRates] = useState<VendorRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/vendor/rates')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setRates(d.rates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await fetch('/api/vendor/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rates: rates
          .filter((r) => r.first_page_cents != null)
          .map((r) => ({
            service_slug: r.service_slug,
            first_page_cents: r.first_page_cents!,
            additional_page_cents: r.additional_page_cents,
          })),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to save');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Rates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set your per-service rates. Suggested rates are 20% below the company rate. Minimum rates apply.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3 w-24">
                <div>Suggested</div>
                <div className="font-normal normal-case text-[10px]">1st / add&apos;l</div>
              </th>
              <th className="px-4 py-3 w-24">Rate ($)</th>
              <th className="px-4 py-3 w-24">Add&apos;l ($)</th>
              <th className="px-4 py-3 w-16">Min</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate, i) => {
              const belowMin = rate.min_vendor_rate_cents != null && rate.first_page_cents != null && rate.first_page_cents < rate.min_vendor_rate_cents;
              return (
                <tr key={rate.service_slug} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{rate.service_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {rate.suggested_first_page_cents != null
                      ? `$${rate.suggested_first_page_cents / 100} / $${rate.suggested_additional_page_cents / 100}`
                      : rate.service_price_label}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={rate.first_page_cents != null ? Math.round(rate.first_page_cents / 100) : ''}
                      onChange={(e) => {
                        const cents = parseInt(e.target.value || '0', 10) * 100;
                        setRates((prev) => prev.map((r) =>
                          r.service_slug === rate.service_slug ? { ...r, first_page_cents: cents } : r
                        ));
                      }}
                      className={`w-full rounded border px-2 py-1 text-sm focus:border-navy focus:ring-1 focus:ring-navy ${belowMin ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={Math.round(rate.additional_page_cents / 100)}
                      onChange={(e) => {
                        const cents = parseInt(e.target.value || '0', 10) * 100;
                        setRates((prev) => prev.map((r) =>
                          r.service_slug === rate.service_slug ? { ...r, additional_page_cents: cents } : r
                        ));
                      }}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {rate.min_vendor_rate_cents != null ? `$${rate.min_vendor_rate_cents / 100}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Rates'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
