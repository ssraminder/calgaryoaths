'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function NewVendorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      id: fd.get('id'),
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
      hours_weekdays: fd.get('hours_weekdays') || '9:00 AM – 9:00 PM',
      hours_saturday: fd.get('hours_saturday') || '10:00 AM – 5:00 PM',
      hours_sunday: fd.get('hours_sunday') || 'Closed',
      google_maps_embed: fd.get('google_maps_embed'),
      map_url: fd.get('map_url'),
      areas_served: splitTags(fd.get('areas_served') as string),
      nearby_neighbourhoods: splitTags(fd.get('nearby_neighbourhoods') as string),
      booking_fee_cents: Number(fd.get('booking_fee_dollars') || 40) * 100,
      active: fd.get('active') === 'on',
      sort_order: Number(fd.get('sort_order') || 0),
    };

    const res = await fetch('/api/admin/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create');
      setSaving(false);
      return;
    }

    router.push('/admin/vendors');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.push('/admin/vendors')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Vendors
      </button>
      <h1 className="text-2xl font-semibold text-gray-900">Add Commissioner</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field name="id" label="ID (slug)" required placeholder="john-doe" />
          <Field name="name" label="Full Name" required />
          <Field name="title" label="Title" placeholder="Commissioner of Oaths" />
          <Field name="email" label="Email" type="email" />
          <Field name="phone" label="Phone" />
          <Field name="location" label="Location Label" placeholder="Downtown Calgary" />
          <Field name="location_slug" label="Location Slug" placeholder="downtown-calgary" />
          <Field name="address" label="Address" />
        </div>

        <Field name="bio" label="Bio" textarea />
        <Field name="calendly_url" label="Calendly URL" />

        <div className="grid grid-cols-2 gap-4">
          <Field name="languages" label="Languages (comma-separated)" placeholder="English, Punjabi" />
          <Field name="credentials" label="Credentials (comma-separated)" placeholder="Commissioner of Oaths" />
          <Field name="areas_served" label="Areas Served (comma-separated)" />
          <Field name="nearby_neighbourhoods" label="Nearby Neighbourhoods (comma-separated)" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field name="hours_weekdays" label="Weekday Hours" placeholder="9:00 AM – 9:00 PM" />
          <Field name="hours_saturday" label="Saturday Hours" placeholder="10:00 AM – 5:00 PM" />
          <Field name="hours_sunday" label="Sunday Hours" placeholder="Closed" />
        </div>

        <Field name="google_maps_embed" label="Google Maps Embed URL" />
        <Field name="map_url" label="Google Maps Link" />

        <div className="grid grid-cols-3 gap-4">
          <Field name="booking_fee_dollars" label="Booking Fee ($)" type="number" placeholder="40" />
          <Field name="sort_order" label="Sort Order" type="number" placeholder="0" />
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked className="rounded border-gray-300" />
              Active
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Commissioner'}
        </button>
      </form>
    </div>
  );
}

function Field({ name, label, type = 'text', placeholder, required, textarea }: {
  name: string; label: string; type?: string; placeholder?: string; required?: boolean; textarea?: boolean;
}) {
  const cls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {textarea ? (
        <textarea id={name} name={name} rows={3} className={cls} placeholder={placeholder} />
      ) : (
        <input id={name} name={name} type={type} className={cls} placeholder={placeholder} required={required} />
      )}
    </div>
  );
}

function splitTags(val: string): string[] {
  return val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
