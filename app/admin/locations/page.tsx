'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/admin/DataTable';

type Location = {
  id: string;
  name: string;
  commissioner_id: string;
  address: string;
  phone: string;
  active: boolean;
  sort_order: number;
};

const columns: Column<Location>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'commissioner_id', header: 'Commissioner', sortable: true },
  { key: 'address', header: 'Address' },
  { key: 'phone', header: 'Phone' },
  { key: 'sort_order', header: 'Order', sortable: true },
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

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((d) => { setLocations(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
      <DataTable
        columns={columns}
        data={locations}
        onRowClick={(r) => router.push(`/admin/locations/${r.id}`)}
      />
    </div>
  );
}
