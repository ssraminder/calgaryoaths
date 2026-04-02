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
  gst_number: string | null;
  gst_registered: boolean;
  mobile_available: boolean;
  virtual_available: boolean;
  min_booking_buffer_hours: number | null;
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
  min_vendor_rate_cents: number | null;
  suggested_first_page_cents: number | null;
  suggested_additional_page_cents: number;
  first_page_cents: number | null;
  additional_page_cents: number;
  drafting_fee_cents: number;
  is_saved: boolean;
  is_default: boolean;
  offered: boolean;
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
  const [availLocations, setAvailLocations] = useState<{ id: string; name: string }[]>([]);
  const [newRule, setNewRule] = useState({ days: [1] as number[], start_time: '09:00', end_time: '17:00', location_id: '' });
  const [addingRule, setAddingRule] = useState(false);

  // Blocked dates
  type BlockedDate = { id: string; blocked_date: string; reason: string };
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockEndDate, setNewBlockEndDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Date overrides (custom times)
  type CustomTime = { id: string; custom_date: string; start_time: string; end_time: string; mode: string; reason: string };
  const [customTimes, setCustomTimes] = useState<CustomTime[]>([]);
  const [newCustomDate, setNewCustomDate] = useState('');
  const [newCustomStart, setNewCustomStart] = useState('09:00');
  const [newCustomEnd, setNewCustomEnd] = useState('17:00');
  const [newCustomMode, setNewCustomMode] = useState<'add' | 'block'>('block');
  const [newCustomReason, setNewCustomReason] = useState('');

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
      if (Array.isArray(availRes?.locations)) setAvailLocations(availRes.locations);
      if (Array.isArray(availRes?.blockedDates)) setBlockedDates(availRes.blockedDates);
      if (Array.isArray(availRes?.customTimes)) setCustomTimes(availRes.customTimes);
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
      google_maps_embed: fd.get('google_maps_embed'),
      map_url: fd.get('map_url'),
      areas_served: neighbourhoods,
      nearby_neighbourhoods: neighbourhoods,
      commission_rate: Number(fd.get('commission_rate') || 20),
      is_partner: fd.get('is_partner') === 'on',
      gst_number: fd.get('gst_number') || null,
      gst_registered: fd.get('gst_registered') === 'on',
      mobile_available: fd.get('mobile_available') === 'on',
      virtual_available: fd.get('virtual_available') === 'on',
      min_booking_buffer_hours: fd.get('min_booking_buffer_hours') ? Number(fd.get('min_booking_buffer_hours')) : null,
      active: fd.get('active') === 'on',
      sort_order: Number(fd.get('sort_order') || 0),
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
    if (newRule.days.length === 0) return;
    setAddingRule(true);
    const res = await fetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commissioner_id: id,
        days_of_week: newRule.days,
        start_time: newRule.start_time,
        end_time: newRule.end_time,
        location_id: newRule.location_id || undefined,
      }),
    });
    if (res.ok) {
      const newRules = await res.json();
      setRules((prev) => [...prev, ...(Array.isArray(newRules) ? newRules : [newRules])]);
    }
    setAddingRule(false);
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

      {/* Booking link */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-1">Direct booking link</p>
          <a href={`/book/${id}`} target="_blank" rel="noopener noreferrer"
            className="text-sm text-navy hover:text-gold break-all">
            calgaryoaths.com/book/{id}
          </a>
        </div>
        <button type="button"
          onClick={() => navigator.clipboard.writeText(`https://calgaryoaths.com/book/${id}`)}
          className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 flex-shrink-0">
          Copy
        </button>
      </div>

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

        <Field name="google_maps_embed" label="Google Maps Embed URL" defaultValue={commissioner.google_maps_embed} />
        <Field name="map_url" label="Google Maps Link" defaultValue={commissioner.map_url} />

        {/* Commission section */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Commission</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field name="commission_rate" label="Commission (%)" type="number" defaultValue={String(commissioner.commission_rate ?? 20)} />
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_partner" defaultChecked={commissioner.is_partner} className="rounded border-gray-300" />
                Partner vendor
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Commission is only charged on partner vendors. Platform keeps {commissioner.commission_rate ?? 20}% of each service fee. Per-service rates are set in the Service Pricing table below.
          </p>
        </div>

        {/* GST/HST Registration */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">GST/HST Registration</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field name="gst_number" label="GST/HST Number" defaultValue={commissioner.gst_number ?? ''} />
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="gst_registered" defaultChecked={commissioner.gst_registered} className="rounded border-gray-300" />
                GST registered
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            If GST registered, 5% GST will be added to vendor payouts. The GST number appears on payout records.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Field name="sort_order" label="Sort Order" type="number" defaultValue={String(commissioner.sort_order)} />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={commissioner.active} className="rounded border-gray-300" />
              Active
            </label>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="mobile_available" defaultChecked={commissioner.mobile_available} className="rounded border-gray-300" />
              Mobile
            </label>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="virtual_available" defaultChecked={commissioner.virtual_available} className="rounded border-gray-300" />
              Virtual
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lead Time</label>
            <select
              name="min_booking_buffer_hours"
              defaultValue={commissioner.min_booking_buffer_hours ?? ''}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Default</option>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="4">4 hours</option>
              <option value="8">8 hours</option>
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
            </select>
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
              Set per-service rates. Suggested rate is 20% below the company rate (rounded to nearest $5).
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
          <p className="text-sm text-gray-400">Loading services…</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Copy all suggested button */}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => {
                  setVendorRates((prev) =>
                    prev.map((r) => ({
                      ...r,
                      first_page_cents: r.suggested_first_page_cents ?? r.first_page_cents,
                      additional_page_cents: r.suggested_additional_page_cents ?? r.additional_page_cents,
                      is_default: false,
                    }))
                  );
                }}
                className="text-xs text-gold hover:text-gold-light font-medium"
              >
                Copy all suggested rates
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-2 w-12"></th>
                  <th className="pb-2 pr-3">Service</th>
                  <th className="pb-2 pr-3 w-24">
                    <div>Suggested</div>
                    <div className="font-normal normal-case text-[10px] text-gray-400">1st / add&apos;l</div>
                  </th>
                  <th className="pb-2 pr-3 w-20"></th>
                  <th className="pb-2 pr-3 w-24">Rate ($)</th>
                  <th className="pb-2 pr-3 w-24">Add&apos;l ($)</th>
                  <th className="pb-2 w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendorRates.map((rate, i) => {
                  const sugFirst = rate.suggested_first_page_cents;
                  const sugAddl = rate.suggested_additional_page_cents;
                  const matchesSuggested = rate.first_page_cents === sugFirst && rate.additional_page_cents === sugAddl;
                  return (
                    <tr key={rate.service_slug} className={`border-b border-gray-100 ${!rate.offered ? 'opacity-40' : ''} ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={rate.offered}
                          onChange={(e) => {
                            setVendorRates((prev) =>
                              prev.map((r) =>
                                r.service_slug === rate.service_slug
                                  ? { ...r, offered: e.target.checked }
                                  : r
                              )
                            );
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className={`py-2 pr-3 font-medium ${rate.offered ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {rate.service_name}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {sugFirst != null
                          ? <>${sugFirst / 100} / ${sugAddl / 100}</>
                          : rate.service_price_label}
                      </td>
                      <td className="py-2 pr-3">
                        {rate.offered && sugFirst != null && !matchesSuggested && (
                          <button
                            type="button"
                            onClick={() => {
                              setVendorRates((prev) =>
                                prev.map((r) =>
                                  r.service_slug === rate.service_slug
                                    ? { ...r, first_page_cents: sugFirst, additional_page_cents: sugAddl, is_default: false }
                                    : r
                                )
                              );
                            }}
                            className="text-[10px] text-gold hover:text-gold-light font-medium whitespace-nowrap"
                          >
                            Use suggested
                          </button>
                        )}
                        {rate.offered && matchesSuggested && (
                          <span className="text-[10px] text-green-600">= suggested</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {rate.offered ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={rate.first_page_cents != null ? Math.round(rate.first_page_cents / 100) : ''}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value || '0', 10) * 100;
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
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {rate.offered ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={Math.round(rate.additional_page_cents / 100)}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value || '0', 10) * 100;
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
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {!rate.offered ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Off</span>
                        ) : rate.is_saved ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Saved</span>
                        ) : rate.is_default ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Default</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Modified</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                  rates: vendorRates.map((r) => ({
                    service_slug: r.service_slug,
                    first_page_cents: r.first_page_cents,
                    additional_page_cents: r.additional_page_cents,
                    drafting_fee_cents: r.drafting_fee_cents,
                    offered: r.offered,
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
              {savingRates ? 'Saving...' : 'Save Services & Rates'}
            </button>
            {ratesSaved && <span className="text-sm text-green-600">Saved!</span>}
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
        <div className="border-t border-gray-200 pt-4 space-y-3">
          {/* Day chips */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Days</label>
            <div className="flex flex-wrap gap-1.5">
              {/* Quick-select buttons */}
              {[
                { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                { label: 'Weekends', days: [0, 6] },
                { label: 'All', days: [0, 1, 2, 3, 4, 5, 6] },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setNewRule({ ...newRule, days: preset.days })}
                  className={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ${
                    JSON.stringify(newRule.days.sort()) === JSON.stringify(preset.days.sort())
                      ? 'bg-gold text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <span className="text-gray-300 mx-1">|</span>
              {DAYS.map((dayName, dayIdx) => {
                const isSelected = newRule.days.includes(dayIdx);
                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => {
                      setNewRule({
                        ...newRule,
                        days: isSelected
                          ? newRule.days.filter((d) => d !== dayIdx)
                          : [...newRule.days, dayIdx],
                      });
                    }}
                    className={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-navy text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dayName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time + Location + Add */}
          <div className="flex items-end gap-3 flex-wrap">
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
            {availLocations.length > 1 && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Location</label>
                <select
                  value={newRule.location_id}
                  onChange={(e) => setNewRule({ ...newRule, location_id: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Auto (first location)</option>
                  {availLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={addRule}
              disabled={newRule.days.length === 0 || addingRule}
              className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {addingRule ? 'Adding...' : `Add${newRule.days.length > 1 ? ` (${newRule.days.length} days)` : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Blocked Dates</h2>
        <p className="text-sm text-gray-500">
          Block specific dates when this vendor is unavailable (holidays, time off, etc.).
          Customers cannot book on blocked dates.
        </p>

        {blockedDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((bd) => (
              <span key={bd.id} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                {new Date(bd.blocked_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                {bd.reason && <span className="text-red-400">({bd.reason})</span>}
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/availability?id=${bd.id}&type=blocked_date`, { method: 'DELETE' });
                    setBlockedDates((prev) => prev.filter((d) => d.id !== bd.id));
                  }}
                  className="text-red-300 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No dates blocked.</p>
        )}

        <div className="flex items-end gap-3 border-t border-gray-200 pt-4 flex-wrap">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start Date</label>
            <input
              type="date"
              value={newBlockDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setNewBlockDate(e.target.value); if (!newBlockEndDate) setNewBlockEndDate(e.target.value); }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End Date (optional)</label>
            <input
              type="date"
              value={newBlockEndDate}
              min={newBlockDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewBlockEndDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs text-gray-500">Reason (optional)</label>
            <input
              type="text"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="e.g. Vacation, Holiday"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!newBlockDate) return;
              // Build array of dates from start to end
              const dates: string[] = [];
              const start = new Date(newBlockDate + 'T12:00:00');
              const end = newBlockEndDate ? new Date(newBlockEndDate + 'T12:00:00') : start;
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split('T')[0]);
              }
              const res = await fetch('/api/admin/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'blocked_date', commissioner_id: id, dates, reason: newBlockReason }),
              });
              if (res.ok) {
                const data = await res.json();
                setBlockedDates((prev) => [...prev, ...data].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
                setNewBlockDate('');
                setNewBlockEndDate('');
                setNewBlockReason('');
              }
            }}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> Block
          </button>
        </div>
      </div>
      {/* Date Overrides */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Date Overrides</h2>
        <p className="text-sm text-gray-500">
          Override regular schedule for specific dates. Block time windows or add extra availability.
        </p>

        {customTimes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customTimes.map((ct) => {
              const isBlock = ct.mode === 'block';
              return (
                <span key={ct.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isBlock ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isBlock ? 'bg-red-500' : 'bg-green-500'}`} />
                  {new Date(ct.custom_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}{ct.start_time.slice(0, 5)} – {ct.end_time.slice(0, 5)}
                  <span className={isBlock ? 'text-red-400' : 'text-green-400'}>
                    ({isBlock ? 'blocked' : 'extra'}{ct.reason ? ` — ${ct.reason}` : ''})
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/availability?id=${ct.id}&type=custom_time`, { method: 'DELETE' });
                      setCustomTimes((prev) => prev.filter((t) => t.id !== ct.id));
                    }}
                    className={isBlock ? 'text-red-300 hover:text-red-600' : 'text-green-300 hover:text-red-500'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No date overrides set.</p>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setNewCustomMode('block')}
              className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${newCustomMode === 'block' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              Block time
              {newCustomMode === 'block' && <span className="block text-[10px] font-normal mt-0.5">Remove slots from this window</span>}
            </button>
            <button type="button" onClick={() => setNewCustomMode('add')}
              className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${newCustomMode === 'add' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              Add extra time
              {newCustomMode === 'add' && <span className="block text-[10px] font-normal mt-0.5">Open slots beyond regular hours</span>}
            </button>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Date</label>
              <input type="date" value={newCustomDate} min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewCustomDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">From</label>
              <input type="time" value={newCustomStart} onChange={(e) => setNewCustomStart(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">To</label>
              <input type="time" value={newCustomEnd} onChange={(e) => setNewCustomEnd(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="mb-1 block text-xs text-gray-500">Reason (optional)</label>
              <input type="text" value={newCustomReason} onChange={(e) => setNewCustomReason(e.target.value)}
                placeholder={newCustomMode === 'block' ? 'e.g. Personal, Appointment' : 'e.g. Extended hours'}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <button type="button" disabled={!newCustomDate || !newCustomStart || !newCustomEnd}
              onClick={async () => {
                const res = await fetch('/api/admin/availability', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'custom_time',
                    commissioner_id: id,
                    custom_date: newCustomDate,
                    start_time: newCustomStart,
                    end_time: newCustomEnd,
                    mode: newCustomMode,
                    reason: newCustomReason,
                  }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setCustomTimes((prev) => [...prev, data].sort((a, b) => a.custom_date.localeCompare(b.custom_date)));
                  setNewCustomDate('');
                  setNewCustomReason('');
                }
              }}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${newCustomMode === 'block' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              <Plus className="h-4 w-4" /> {newCustomMode === 'block' ? 'Block Time' : 'Add Time'}
            </button>
          </div>
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
