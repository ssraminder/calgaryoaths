'use client';

import { useEffect, useState } from 'react';

type VendorSettings = {
  mobile_available: boolean;
  virtual_available: boolean;
  mobile_rate_per_km_cents: number;
  mobile_minimum_fee_cents: number;
  min_booking_buffer_hours: number;
  auto_accept_all: boolean;
};

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
  const [settings, setSettings] = useState<VendorSettings>({
    mobile_available: false,
    virtual_available: false,
    mobile_rate_per_km_cents: 300,
    mobile_minimum_fee_cents: 3000,
    min_booking_buffer_hours: 4,
    auto_accept_all: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/rates').then((r) => r.ok ? r.json() : { rates: [] }),
      fetch('/api/vendor/settings').then((r) => r.ok ? r.json() : null),
    ]).then(([ratesData, settingsData]) => {
      setRates(ratesData.rates ?? []);
      if (settingsData) setSettings(settingsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSavedSettings(false);
    await fetch('/api/vendor/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSavedSettings(true);
    setSavingSettings(false);
    setTimeout(() => setSavedSettings(false), 3000);
  }

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
      <h1 className="text-2xl font-semibold text-gray-900">Rates & Services</h1>

      {/* Service Delivery Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Service Delivery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Mobile Service</p>
              <p className="text-xs text-gray-500">Travel to customer&apos;s location</p>
            </div>
            <input
              type="checkbox"
              checked={settings.mobile_available}
              onChange={(e) => setSettings({ ...settings, mobile_available: e.target.checked })}
              className="rounded border-gray-300 text-navy focus:ring-navy h-5 w-5"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Virtual Service</p>
              <p className="text-xs text-gray-500">Video call appointments</p>
            </div>
            <input
              type="checkbox"
              checked={settings.virtual_available}
              onChange={(e) => setSettings({ ...settings, virtual_available: e.target.checked })}
              className="rounded border-gray-300 text-navy focus:ring-navy h-5 w-5"
            />
          </label>
        </div>

        {settings.mobile_available && (
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-3">
            <p className="text-sm font-medium text-charcoal">Mobile Travel Fee</p>
            <p className="text-xs text-gray-500">Customer is charged the higher of: (distance × per-km rate) or the flat minimum fee.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Per-km rate ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={(settings.mobile_rate_per_km_cents / 100).toFixed(1)}
                  onChange={(e) => setSettings({ ...settings, mobile_rate_per_km_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Minimum fee ($)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={Math.round(settings.mobile_minimum_fee_cents / 100)}
                  onChange={(e) => setSettings({ ...settings, mobile_minimum_fee_cents: parseInt(e.target.value || '0', 10) * 100 })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Example: 15 km trip at ${(settings.mobile_rate_per_km_cents / 100).toFixed(1)}/km = ${((15 * settings.mobile_rate_per_km_cents) / 100).toFixed(0)}.
              Min fee = ${Math.round(settings.mobile_minimum_fee_cents / 100)}. Customer pays ${Math.max(15 * settings.mobile_rate_per_km_cents, settings.mobile_minimum_fee_cents) / 100}.
            </p>
          </div>
        )}

        {/* Booking Settings */}
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Booking Settings</h3>

          {/* Lead time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum lead time (hours)</label>
            <select
              value={settings.min_booking_buffer_hours}
              onChange={(e) => setSettings({ ...settings, min_booking_buffer_hours: Number(e.target.value) })}
              className="w-full sm:w-48 rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours (1 day)</option>
              <option value={48}>48 hours (2 days)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The earliest a customer can book is {settings.min_booking_buffer_hours} hour{settings.min_booking_buffer_hours !== 1 ? 's' : ''} from now.
              For example, if a customer is booking at 10:00 AM, the earliest available slot would be {settings.min_booking_buffer_hours === 1 ? '11:00 AM' : settings.min_booking_buffer_hours === 2 ? '12:00 PM' : settings.min_booking_buffer_hours === 4 ? '2:00 PM' : settings.min_booking_buffer_hours === 8 ? '6:00 PM' : 'the next day'} today.
              Set this to give yourself enough time to prepare for appointments.
            </p>
          </div>

          {/* Auto-accept */}
          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Accept all bookings automatically</p>
              <p className="text-xs text-gray-500">
                When enabled, paid bookings are automatically confirmed without requiring your manual review.
                When disabled, you&apos;ll receive an email for each booking and must click &quot;Confirm&quot; to accept it.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_accept_all}
              onChange={(e) => setSettings({ ...settings, auto_accept_all: e.target.checked })}
              className="rounded border-gray-300 text-navy focus:ring-navy h-5 w-5 flex-shrink-0 ml-4"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSaveSettings} disabled={savingSettings}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
          {savedSettings && <span className="text-sm text-green-600">Settings saved!</span>}
        </div>
      </div>

      {/* Service Rates */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-1">Service Rates</h2>
        <p className="text-sm text-gray-500 mb-3">
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
