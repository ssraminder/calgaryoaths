'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';
import TagInput from '@/components/shared/TagInput';

const LANGUAGE_SUGGESTIONS = [
  'English', 'Punjabi', 'Hindi', 'Gujarati', 'Urdu', 'Arabic', 'French',
  'Spanish', 'Mandarin', 'Cantonese', 'Tagalog', 'Korean', 'Vietnamese',
  'Farsi', 'Turkish', 'Somali', 'Amharic', 'Tigrinya', 'Swahili',
];

const CREDENTIAL_SUGGESTIONS = [
  'Commissioner of Oaths (Alberta)',
  'Notary Public (Alberta)',
  'Commissioner of Oaths (British Columbia)',
  'Commissioner of Oaths (Ontario)',
  'Lawyer (Alberta)',
  'Paralegal',
];

const NEIGHBOURHOOD_SUGGESTIONS = [
  'Beltline', '17th Ave SW', 'Mission', 'Cliff Bungalow', 'Victoria Park',
  'Downtown Core', 'Downtown Calgary', 'South Calgary', 'Sunalta', 'Bankview',
  'Redstone', 'Cornerstone', 'Cityscape', 'Country Hills', 'Saddle Ridge',
  'Falconridge', 'Taradale', 'NE Calgary', 'Martindale', 'Pineridge',
  'Rundle', 'Temple', 'Castleridge', 'Bridgeland', 'Kensington',
  'Marda Loop', 'Inglewood', 'Ramsay', 'Airdrie', 'Cochrane', 'Chestermere',
  'Panorama Hills', 'Evanston', 'Nolan Hill', 'Sage Hill', 'Coventry Hills',
  'Harvest Hills', 'Tuscany', 'Royal Oak', 'Arbour Lake', 'Varsity',
  'Brentwood', 'Dalhousie', 'Edgemont', 'Hawkwood', 'Ranchlands',
  'Cranston', 'Auburn Bay', 'Mahogany', 'McKenzie Towne', 'New Brighton',
  'Seton', 'Copperfield', 'Chaparral', 'Lake Bonavista', 'Shawnessy',
  'Somerset', 'Evergreen', 'Midnapore', 'Sundance', 'Deer Ridge',
];

type Commissioner = {
  id: string;
  name: string;
  title: string;
  bio: string;
  location: string;
  location_slug: string;
  address: string;
  phone: string;
  email: string;
  calendly_url: string;
  languages: string[];
  credentials: string[];
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  google_maps_embed: string;
  map_url: string;
  areas_served: string[];
  nearby_neighbourhoods: string[];
  booking_fee_cents: number | null;
  commission_rate: number | null;
  is_partner: boolean;
  user_id: string | null;
  active: boolean;
  sort_order: number;
  co_commissioner_services: { service_slug: string }[];
};

type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

type VendorRate = {
  service_slug: string;
  service_name: string;
  service_price: number | null;
  service_price_label: string;
  first_page_cents: number | null;
  additional_page_cents: number;
  drafting_fee_cents: number;
  is_saved: boolean;
  is_default: boolean;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commissioner, setCommissioner] = useState<Commissioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [allServices, setAllServices] = useState<{ slug: string; name: string }[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Tag fields
  const [languages, setLanguages] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<string[]>([]);
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);

  // Vendor rates
  const [vendorRates, setVendorRates] = useState<VendorRate[]>([]);
  const [savingRates, setSavingRates] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [ratesSaved, setRatesSaved] = useState(false);

  // Availability rules
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [newRule, setNewRule] = useState({ day_of_week: 1, start_time: '09:00', end_time: '12:00' });

  function fetchVendorRates() {
    fetch(`/api/admin/vendor-rates?commissionerId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.rates)) setVendorRates(data.rates);
      })
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/vendors/${id}`).then((r) => r.json()),
      fetch('/api/booking/services').then((r) => r.json()),
      fetch(`/api/admin/availability?commissionerId=${id}`).then((r) => r.json()),
      fetch(`/api/admin/vendor-rates?commissionerId=${id}`).then((r) => r.json()),
    ]).then(([vendor, servicesRes, availRes, ratesRes]) => {
      if (vendor.id) {
        setCommissioner(vendor);
        setSelectedServices(
          (vendor.co_commissioner_services || []).map((s: { service_slug: string }) => s.service_slug)
        );
        setLanguages(vendor.languages ?? []);
        setCredentials(vendor.credentials ?? []);
        // Merge areas_served + nearby_neighbourhoods into one field, deduped
        const merged = Array.from(new Set([
          ...(vendor.nearby_neighbourhoods ?? []),
          ...(vendor.areas_served ?? []),
        ]));
        setNeighbourhoods(merged);
      }
      setAllServices(Array.isArray(servicesRes?.services) ? servicesRes.services : Array.isArray(servicesRes) ? servicesRes : []);
      setRules(Array.isArray(availRes?.rules) ? availRes.rules : Array.isArray(availRes) ? availRes : []);
      if (Array.isArray(ratesRes?.rates)) setVendorRates(ratesRes.rates);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      title: fd.get('title'),
      bio: fd.get('bio'),
      location: fd.get('location'),
      location_slug: fd.get('location_slug'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      calendly_url: fd.get('calendly_url'),
      languages,
      credentials,
      hours_weekdays: fd.get('hours_weekdays'),
      hours_saturday: fd.get('hours_saturday'),
      hours_sunday: fd.get('hours_sunday'),
      google_maps_embed: fd.get('google_maps_embed'),
      map_url: fd.get('map_url'),
      areas_served: neighbourhoods,
      nearby_neighbourhoods: neighbourhoods,
      booking_fee_cents: Number(fd.get('booking_fee_dollars') || 40) * 100,
      commission_rate: Number(fd.get('commission_rate') || 20),
      is_partner: fd.get('is_partner') === 'on',
      active: fd.get('active') === 'on',
      sort_order: Number(fd.get('sort_order') || 0),
      services: selectedServices,
    };

    const res = await fetch(`/api/admin/vendors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to save');
      setSaving(false);
      return;
    }
    router.push('/admin/vendors');
  }

  async function addRule() {
    const res = await fetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissioner_id: id, ...newRule }),
    });
    if (res.ok) {
      const rule = await res.json();
      setRules((prev) => [...prev, rule]);
    }
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/admin/availability?id=${ruleId}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  if (loading || !commissioner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.push('/admin/vendors')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Vendors
      </button>
      <h1 className="text-2xl font-semibold text-gray-900">Edit: {commissioner.name}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field name="name" label="Full Name" defaultValue={commissioner.name} required />
          <Field name="title" label="Title" defaultValue={commissioner.title} />
          <Field name="email" label="Email" type="email" defaultValue={commissioner.email} />
          <Field name="phone" label="Phone" defaultValue={commissioner.phone} />
          <Field name="location" label="Location Label" defaultValue={commissioner.location} />
          <Field name="location_slug" label="Location Slug" defaultValue={commissioner.location_slug} />
          <AddressAutocomplete
            name="address"
            label="Address"
            defaultValue={commissioner.address}
            onAddressResolved={(data) => {
              const form = document.querySelector('form');
              if (form) {
                const setVal = (n: string, v: string) => {
                  const el = form.querySelector<HTMLInputElement>(`[name="${n}"]`);
                  if (el) { el.value = v; el.dispatchEvent(new Event('change')); }
                };
                setVal('google_maps_embed', data.googleMapsEmbed);
                setVal('map_url', data.mapUrl);
              }
            }}
          />
          <Field name="calendly_url" label="Calendly URL" defaultValue={commissioner.calendly_url} />
        </div>

        <Field name="bio" label="Bio" textarea defaultValue={commissioner.bio} />

        <div className="grid grid-cols-2 gap-4">
          <TagInput
            name="languages"
            label="Languages"
            value={languages}
            onChange={setLanguages}
            suggestions={LANGUAGE_SUGGESTIONS}
            placeholder="Add language…"
          />
          <TagInput
            name="credentials"
            label="Credentials"
            value={credentials}
            onChange={setCredentials}
            suggestions={CREDENTIAL_SUGGESTIONS}
            placeholder="Add credential…"
          />
        </div>
        <TagInput
          name="neighbourhoods"
          label="Areas Served & Nearby Neighbourhoods"
          value={neighbourhoods}
          onChange={setNeighbourhoods}
          suggestions={NEIGHBOURHOOD_SUGGESTIONS}
          placeholder="Add neighbourhood or area…"
        />

        <div className="grid grid-cols-3 gap-4">
          <Field name="hours_weekdays" label="Weekday Hours" defaultValue={commissioner.hours_weekdays} />
          <Field name="hours_saturday" label="Saturday Hours" defaultValue={commissioner.hours_saturday} />
          <Field name="hours_sunday" label="Sunday Hours" defaultValue={commissioner.hours_sunday} />
        </div>

        <Field name="google_maps_embed" label="Google Maps Embed URL" defaultValue={commissioner.google_maps_embed} />
        <Field name="map_url" label="Google Maps Link" defaultValue={commissioner.map_url} />

        {/* Services checkboxes */}
        {allServices.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Services Offered</label>
            <div className="flex flex-wrap gap-3">
              {allServices.map((s) => (
                <label key={s.slug} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.slug)}
                    onChange={(e) => {
                      setSelectedServices((prev) =>
                        e.target.checked ? [...prev, s.slug] : prev.filter((x) => x !== s.slug)
                      );
                    }}
                    className="rounded border-gray-300"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Commission & Fee section */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Pricing & Commission</h3>
          <div className="grid grid-cols-3 gap-4">
            <Field name="booking_fee_dollars" label="Booking Fee ($)" type="number" defaultValue={String((commissioner.booking_fee_cents ?? 4000) / 100)} />
            <Field name="commission_rate" label="Commission (%)" type="number" defaultValue={String(commissioner.commission_rate ?? 20)} />
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_partner" defaultChecked={commissioner.is_partner} className="rounded border-gray-300" />
                Partner vendor
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Commission is only charged on partner vendors. Platform keeps {commissioner.commission_rate ?? 20}% of the booking fee.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field name="sort_order" label="Sort Order" type="number" defaultValue={String(commissioner.sort_order)} />
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={commissioner.active} className="rounded border-gray-300" />
              Active
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Vendor Rates */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Service Pricing</h2>
            <p className="text-sm text-gray-500">
              Set per-service rates for this vendor. Defaults are 50% of the company service price.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchVendorRates}
            className="text-xs text-navy hover:underline"
          >
            Refresh
          </button>
        </div>

        {vendorRates.length === 0 ? (
          <p className="text-sm text-gray-400">
            No services assigned yet. Check services above and save to see pricing options.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4">Service</th>
                  <th className="pb-2 pr-4 w-28">Company Rate</th>
                  <th className="pb-2 pr-4 w-32">Vendor Rate ($)</th>
                  <th className="pb-2 pr-4 w-32">Add&apos;l Page ($)</th>
                  <th className="pb-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendorRates.map((rate, i) => (
                  <tr key={rate.service_slug} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="py-2 pr-4 font-medium text-gray-900">{rate.service_name}</td>
                    <td className="py-2 pr-4 text-gray-500">
                      {rate.service_price != null ? `$${(rate.service_price / 100).toFixed(0)}` : rate.service_price_label}
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rate.first_page_cents != null ? (rate.first_page_cents / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                          setVendorRates((prev) =>
                            prev.map((r) =>
                              r.service_slug === rate.service_slug
                                ? { ...r, first_page_cents: cents, is_default: false }
                                : r
                            )
                          );
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(rate.additional_page_cents / 100).toFixed(2)}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                          setVendorRates((prev) =>
                            prev.map((r) =>
                              r.service_slug === rate.service_slug
                                ? { ...r, additional_page_cents: cents }
                                : r
                            )
                          );
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-navy focus:ring-1 focus:ring-navy"
                      />
                    </td>
                    <td className="py-2">
                      {rate.is_saved ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Saved
                        </span>
                      ) : rate.is_default ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Modified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {vendorRates.length > 0 && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={savingRates}
              onClick={async () => {
                setSavingRates(true);
                setRatesError('');
                setRatesSaved(false);
                const payload = {
                  commissionerId: id,
                  rates: vendorRates
                    .filter((r) => r.first_page_cents != null)
                    .map((r) => ({
                      service_slug: r.service_slug,
                      first_page_cents: r.first_page_cents!,
                      additional_page_cents: r.additional_page_cents,
                      drafting_fee_cents: r.drafting_fee_cents,
                    })),
                };
                const res = await fetch('/api/admin/vendor-rates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) {
                  const data = await res.json();
                  setRatesError(data.error || 'Failed to save rates');
                } else {
                  setRatesSaved(true);
                  fetchVendorRates();
                  setTimeout(() => setRatesSaved(false), 3000);
                }
                setSavingRates(false);
              }}
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {savingRates ? 'Saving Rates...' : 'Save All Rates'}
            </button>
            {ratesSaved && <span className="text-sm text-green-600">Rates saved successfully!</span>}
            {ratesError && <span className="text-sm text-red-600">{ratesError}</span>}
          </div>
        )}
      </div>

      {/* Vendor Account */}
      <VendorAccountSection commissionerId={id} commissionerName={commissioner.name} email={commissioner.email} hasAccount={!!commissioner.user_id} />

      {/* Availability Rules */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Availability Rules</h2>
        <p className="text-sm text-gray-500">
          Define multiple time slots per day. Customers can only book during these windows.
        </p>

        {/* Existing rules grouped by day */}
        <div className="space-y-2">
          {DAYS.map((dayName, dayIdx) => {
            const dayRules = rules.filter((r) => r.day_of_week === dayIdx);
            if (dayRules.length === 0) return null;
            return (
              <div key={dayIdx} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-gray-700">{dayName}</span>
                <div className="flex flex-wrap gap-2">
                  {dayRules.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy">
                      {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                      <button
                        type="button"
                        onClick={() => deleteRule(r.id)}
                        className="ml-1 text-navy/50 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {rules.length === 0 && (
            <p className="text-sm text-gray-400">No availability rules set.</p>
          )}
        </div>

        {/* Add new rule */}
        <div className="flex items-end gap-3 border-t border-gray-200 pt-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Day</label>
            <select
              value={newRule.day_of_week}
              onChange={(e) => setNewRule({ ...newRule, day_of_week: Number(e.target.value) })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start</label>
            <input
              type="time"
              value={newRule.start_time}
              onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End</label>
            <input
              type="time"
              value={newRule.end_time}
              onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, type = 'text', defaultValue, required, textarea }: {
  name: string; label: string; type?: string; defaultValue?: string; required?: boolean; textarea?: boolean;
}) {
  const cls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {textarea ? (
        <textarea id={name} name={name} rows={3} className={cls} defaultValue={defaultValue} />
      ) : (
        <input id={name} name={name} type={type} className={cls} defaultValue={defaultValue} required={required} step={type === 'number' ? 'any' : undefined} />
      )}
    </div>
  );
}

function VendorAccountSection({ commissionerId, commissionerName, email, hasAccount }: {
  commissionerId: string; commissionerName: string; email: string; hasAccount: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(hasAccount);
  const [error, setError] = useState('');
  const [accEmail, setAccEmail] = useState(email || '');
  const [accPassword, setAccPassword] = useState('');

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-medium text-green-800">Vendor account active — can log in at /vendor/login</p>
      </div>
    );
  }

  async function handleCreate() {
    if (!accEmail || !accPassword) { setError('Email and password required'); return; }
    setCreating(true); setError('');
    const res = await fetch(`/api/admin/vendors/${commissionerId}/create-account`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accEmail, password: accPassword, full_name: commissionerName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); setCreating(false); return; }
    setDone(true); setCreating(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="text-lg font-medium text-gray-900">Vendor Account</h2>
      <p className="text-sm text-gray-500">Create login credentials so this vendor can access the Partner Portal.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={accEmail} onChange={(e) => setAccEmail(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={accPassword} onChange={(e) => setAccPassword(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Min 6 characters" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleCreate} disabled={creating} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
        {creating ? 'Creating...' : 'Create Vendor Account'}
      </button>
    </div>
  );
}
