'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stamp, FileText } from 'lucide-react';

export default function NewOrderPicker({ basePath }: { basePath: '/vendor/orders' | '/admin/orders' | '/tablet/orders' }) {
  const router = useRouter();
  const [creating, setCreating] = useState<'apostille' | 'notarization' | null>(null);

  async function create(orderType: 'apostille' | 'notarization') {
    setCreating(orderType);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: orderType }),
      });
      if (!res.ok) {
        alert('Failed to create order');
        return;
      }
      const data = await res.json();
      router.push(`${basePath}/${data.id}`);
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Create new order</h1>
        <p className="text-sm text-gray-500 mt-1">Pick the type of service to start an intake form.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => create('apostille')}
          disabled={creating !== null}
          className="rounded-lg border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-md disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/10">
            <FileText className="h-5 w-5 text-navy" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">Apostille / Authentication</h2>
          <p className="mt-1 text-sm text-gray-500">
            For documents going to a foreign country. Apostille (Hague), authentication + legalization, expedited options, courier.
          </p>
          {creating === 'apostille' && <p className="mt-2 text-xs text-navy">Creating…</p>}
        </button>
        <button
          type="button"
          onClick={() => create('notarization')}
          disabled={creating !== null}
          className="rounded-lg border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-md disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/10">
            <Stamp className="h-5 w-5 text-navy" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">Notarization / Oath Commissioner</h2>
          <p className="mt-1 text-sm text-gray-500">
            Affidavits, statutory declarations, true copies, witnessing of signatures, travel consents. In-office, mobile, or virtual.
          </p>
          {creating === 'notarization' && <p className="mt-2 text-xs text-navy">Creating…</p>}
        </button>
      </div>
    </div>
  );
}
