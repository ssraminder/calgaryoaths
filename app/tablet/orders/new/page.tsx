'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NewOrderPicker from '@/components/orders/NewOrderPicker';

export default function TabletNewOrderPage() {
  return <Suspense><Inner /></Suspense>;
}

function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const type = search.get('type');

  // If launched via the tablet manifest "shortcuts" with ?type=apostille|notarization,
  // create the order immediately and jump to its page.
  useEffect(() => {
    if (type !== 'apostille' && type !== 'notarization') return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: type }),
      });
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        router.replace(`/tablet/orders/${data.id}`);
      }
    })();
    return () => { cancelled = true; };
  }, [type, router]);

  if (type === 'apostille' || type === 'notarization') {
    return <div className="p-6 text-sm text-gray-400">Starting new order…</div>;
  }
  return <NewOrderPicker basePath="/tablet/orders" />;
}
