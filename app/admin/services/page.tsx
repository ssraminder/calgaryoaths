'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/admin/DataTable';

type Service = {
  slug: string;
  name: string;
  short_description: string;
  price: number | null;
  price_label: string;
  requires_review: boolean;
  slot_duration_minutes: number;
  display_order: number;
  active: boolean;
};

const columns: Column<Service>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'slug', header: 'Slug' },
  {
    key: 'price',
    header: 'Price',
    render: (r) => r.price != null ? `$${(r.price / 100).toFixed(0)}` : r.price_label,
  },
  { key: 'slot_duration_minutes', header: 'Duration (min)', sortable: true },
  {
    key: 'requires_review',
    header: 'Review',
    render: (r) => r.requires_review ? 'Yes' : 'No',
  },
  { key: 'display_order', header: 'Order', sortable: true },
  {
    key: 'active',
    header: 'Status',
    render: (r) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {r.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/services')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setServices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleActive(slug: string, active: boolean) {
    await fetch(`/api/admin/services/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    setServices((prev) =>
      prev.map((s) => (s.slug === slug ? { ...s, active: !active } : s))
    );
  }

  const columnsWithToggle: Column<Service>[] = [
    ...columns.filter((c) => c.key !== 'active'),
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(r.slug, r.active); }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.active ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${r.active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Services</h1>
      <DataTable
        columns={columnsWithToggle}
        data={services}
        onRowClick={(r) => router.push(`/admin/services/${r.slug}`)}
      />
    </div>
  );
}
