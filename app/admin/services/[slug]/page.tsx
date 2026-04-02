'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Service = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
  requires_review: boolean;
  review_reason: string | null;
  slot_duration_minutes: number;
  display_order: number;
  active: boolean;
  booking_notice: string | null;
};

export default function EditServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/services/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.slug) setService(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      short_description: fd.get('short_description'),
      price: fd.get('price_dollars') ? Number(fd.get('price_dollars')) * 100 : null,
      price_label: fd.get('price_label'),
      requires_review: fd.get('requires_review') === 'on',
      review_reason: fd.get('review_reason') || null,
      slot_duration_minutes: Number(fd.get('slot_duration_minutes') || 30),
      display_order: Number(fd.get('display_order') || 0),
      active: fd.get('active') === 'on',
      booking_notice: fd.get('booking_notice') || null,
    };

    const res = await fetch(`/api/admin/services/${slug}`, {
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
    router.push('/admin/services');
  }

  if (loading || !service) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button onClick={() => router.push('/admin/services')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Services
      </button>
      <h1 className="text-2xl font-semibold text-gray-900">Edit: {service.name}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <Field name="name" label="Name" defaultValue={service.name} required />
        <Field name="short_description" label="Short Description" defaultValue={service.short_description} textarea />
        <div className="grid grid-cols-2 gap-4">
          <Field name="price_dollars" label="Price ($, blank = quote)" type="number" defaultValue={service.price != null ? String(service.price / 100) : ''} />
          <Field name="price_label" label="Price Label" defaultValue={service.price_label} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field name="slot_duration_minutes" label="Slot Duration (min)" type="number" defaultValue={String(service.slot_duration_minutes)} />
          <Field name="display_order" label="Display Order" type="number" defaultValue={String(service.display_order)} />
        </div>
        <Field name="review_reason" label="Review Reason" defaultValue={service.review_reason || ''} />
        <Field name="booking_notice" label="Booking Notice (shown before payment)" textarea defaultValue={service.booking_notice || ''} />

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requires_review" defaultChecked={service.requires_review} className="rounded border-gray-300" />
            Requires Manual Review
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={service.active} className="rounded border-gray-300" />
            Active
          </label>
        </div>

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
        <input id={name} name={name} type={type} className={cls} defaultValue={defaultValue} required={required} />
      )}
    </div>
  );
}
