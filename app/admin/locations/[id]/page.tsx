'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Location = {
  id: string;
  name: string;
  commissioner_id: string;
  address: string;
  phone: string;
  parking_notes: string;
  nearby_neighbourhoods: string[];
  google_maps_embed: string;
  map_url: string;
  calendly_url: string;
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  geo_lat: number | null;
  geo_lng: number | null;
  active: boolean;
  sort_order: number;
};

export default function EditLocationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [commissioners, setCommissioners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/locations/${id}`).then((r) => r.json()),
      fetch('/api/admin/vendors').then((r) => r.json()),
    ]).then(([loc, vendors]) => {
      if (loc.id) setLocation(loc);
      setCommissioners((vendors ?? []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })));
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
      commissioner_id: fd.get('commissioner_id'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      parking_notes: fd.get('parking_notes'),
      nearby_neighbourhoods: splitTags(fd.get('nearby_neighbourhoods') as string),
      google_maps_embed: fd.get('google_maps_embed'),
      map_url: fd.get('map_url'),
      calendly_url: fd.get('calendly_url'),
      hours_weekdays: fd.get('hours_weekdays'),
      hours_saturday: fd.get('hours_saturday'),
      hours_sunday: fd.get('hours_sunday'),
      geo_lat: fd.get('geo_lat') ? Number(fd.get('geo_lat')) : null,
      geo_lng: fd.get('geo_lng') ? Number(fd.get('geo_lng')) : null,
      active: fd.get('active') === 'on',
      sort_order: Number(fd.get('sort_order') || 0),
    };

    const res = await fetch(`/api/admin/locations/${id}`, {
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
    router.push('/admin/locations');
  }

  if (loading || !location) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button onClick={() => router.push('/admin/locations')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Locations
      </button>
      <h1 className="text-2xl font-semibold text-gray-900">Edit: {location.name}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field name="name" label="Name" defaultValue={location.name} required />
          <div>
            <label htmlFor="commissioner_id" className="mb-1 block text-sm font-medium text-gray-700">Commissioner</label>
            <select id="commissioner_id" name="commissioner_id" defaultValue={location.commissioner_id} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {commissioners.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <Field name="address" label="Address" defaultValue={location.address} />
        <div className="grid grid-cols-2 gap-4">
          <Field name="phone" label="Phone" defaultValue={location.phone} />
          <Field name="calendly_url" label="Calendly URL" defaultValue={location.calendly_url} />
        </div>
        <Field name="parking_notes" label="Parking Notes" defaultValue={location.parking_notes} textarea />
        <Field name="nearby_neighbourhoods" label="Nearby Neighbourhoods (comma-separated)" defaultValue={location.nearby_neighbourhoods?.join(', ')} />

        <div className="grid grid-cols-3 gap-4">
          <Field name="hours_weekdays" label="Weekday Hours" defaultValue={location.hours_weekdays} />
          <Field name="hours_saturday" label="Saturday Hours" defaultValue={location.hours_saturday} />
          <Field name="hours_sunday" label="Sunday Hours" defaultValue={location.hours_sunday} />
        </div>

        <Field name="google_maps_embed" label="Google Maps Embed URL" defaultValue={location.google_maps_embed} />
        <Field name="map_url" label="Google Maps Link" defaultValue={location.map_url} />

        <div className="grid grid-cols-3 gap-4">
          <Field name="geo_lat" label="Latitude" type="number" defaultValue={location.geo_lat != null ? String(location.geo_lat) : ''} />
          <Field name="geo_lng" label="Longitude" type="number" defaultValue={location.geo_lng != null ? String(location.geo_lng) : ''} />
          <Field name="sort_order" label="Sort Order" type="number" defaultValue={String(location.sort_order)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={location.active} className="rounded border-gray-300" />
          Active
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
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
