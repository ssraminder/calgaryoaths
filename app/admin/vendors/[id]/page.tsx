'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
  active: boolean;
  sort_order: number;
  co_commissioner_services: { service_slug: string }[];
};

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commissioner, setCommissioner] = useState<Commissioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // All available services for checkboxes
  const [allServices, setAllServices] = useState<{ slug: string; name: string }[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/vendors/${id}`).then((r) => r.json()),
      fetch('/api/booking/services').then((r) => r.json()),
    ]).then(([vendor, services]) => {
      if (vendor.id) {
        setCommissioner(vendor);
        setSelectedServices(
          (vendor.co_commissioner_services || []).map((s: { service_slug: string }) => s.service_slug)
        );
      }
      setAllServices(services ?? []);
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

        <div className="grid grid-cols-3 gap-4">
          <Field name="booking_fee_dollars" label="Booking Fee ($)" type="number" defaultValue={String((commissioner.booking_fee_cents ?? 4000) / 100)} />
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
    </div>
  );
}

function Field({ name, label, type = 'text', placeholder, required, textarea, defaultValue }: {
  name: string; label: string; type?: string; placeholder?: string; required?: boolean; textarea?: boolean; defaultValue?: string;
}) {
  const cls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {textarea ? (
        <textarea id={name} name={name} rows={3} className={cls} placeholder={placeholder} defaultValue={defaultValue} />
      ) : (
        <input id={name} name={name} type={type} className={cls} placeholder={placeholder} required={required} defaultValue={defaultValue} />
      )}
    </div>
  );
}

function splitTags(val: string): string[] {
  return val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
