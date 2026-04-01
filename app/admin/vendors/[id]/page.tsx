'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, CalendarCheck, Link as LinkIcon } from 'lucide-react';

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
  cronofy_calendar_id: string | null;
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [commissioner, setCommissioner] = useState<Commissioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [allServices, setAllServices] = useState<{ slug: string; name: string }[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Availability rules
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [newRule, setNewRule] = useState({ day_of_week: 1, start_time: '09:00', end_time: '12:00' });

  // Calendar connect status
  const calendarStatus = searchParams.get('calendar');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/vendors/${id}`).then((r) => r.json()),
      fetch('/api/booking/services').then((r) => r.json()),
      fetch(`/api/admin/availability?commissionerId=${id}`).then((r) => r.json()),
    ]).then(([vendor, services, availRules]) => {
      if (vendor.id) {
        setCommissioner(vendor);
        setSelectedServices(
          (vendor.co_commissioner_services || []).map((s: { service_slug: string }) => s.service_slug)
        );
      }
      setAllServices(services ?? []);
      setRules(availRules ?? []);
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
      languages: splitTags(fd.get('languages') as string),
      credentials: splitTags(fd.get('credentials') as string),
      hours_weekdays: fd.get('hours_weekdays'),
      hours_saturday: fd.get('hours_saturday'),
      hours_sunday: fd.get('hours_sunday'),
      google_maps_embed: fd.get('google_maps_embed'),
      map_url: fd.get('map_url'),
      areas_served: splitTags(fd.get('areas_served') as string),
      nearby_neighbourhoods: splitTags(fd.get('nearby_neighbourhoods') as string),
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

  function connectCalendar() {
    // Redirect to Cronofy OAuth
    window.location.href = `/api/admin/cronofy/connect?commissionerId=${id}`;
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

      {calendarStatus === 'connected' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Calendar connected successfully!
        </div>
      )}
      {calendarStatus === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to connect calendar. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field name="name" label="Full Name" defaultValue={commissioner.name} required />
          <Field name="title" label="Title" defaultValue={commissioner.title} />
          <Field name="email" label="Email" type="email" defaultValue={commissioner.email} />
          <Field name="phone" label="Phone" defaultValue={commissioner.phone} />
          <Field name="location" label="Location Label" defaultValue={commissioner.location} />
          <Field name="location_slug" label="Location Slug" defaultValue={commissioner.location_slug} />
          <Field name="address" label="Address" defaultValue={commissioner.address} />
          <Field name="calendly_url" label="Calendly URL" defaultValue={commissioner.calendly_url} />
        </div>

        <Field name="bio" label="Bio" textarea defaultValue={commissioner.bio} />

        <div className="grid grid-cols-2 gap-4">
          <Field name="languages" label="Languages (comma-separated)" defaultValue={commissioner.languages?.join(', ')} />
          <Field name="credentials" label="Credentials (comma-separated)" defaultValue={commissioner.credentials?.join(', ')} />
          <Field name="areas_served" label="Areas Served (comma-separated)" defaultValue={commissioner.areas_served?.join(', ')} />
          <Field name="nearby_neighbourhoods" label="Nearby Neighbourhoods (comma-separated)" defaultValue={commissioner.nearby_neighbourhoods?.join(', ')} />
        </div>

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

      {/* Calendar Integration */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Calendar Integration</h2>
          {commissioner.cronofy_calendar_id ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              <CalendarCheck className="h-3.5 w-3.5" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Not connected
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Connect a Google or Outlook calendar to automatically block busy times and sync appointments.
        </p>
        <button
          type="button"
          onClick={connectCalendar}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <LinkIcon className="h-4 w-4" />
          {commissioner.cronofy_calendar_id ? 'Reconnect Calendar' : 'Connect Calendar'}
        </button>
      </div>

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

function splitTags(val: string): string[] {
  return val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
