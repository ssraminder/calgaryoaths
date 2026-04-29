'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import OrderWizard from './OrderWizard';
import type { Order, OrderItem, OrderIdPhoto } from '@/lib/orders/types';

export default function OrderDetailLoader({ basePath }: { basePath: '/vendor/orders' | '/admin/orders' | '/tablet/orders' }) {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [idPhotos, setIdPhotos] = useState<OrderIdPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error('Failed to load order');
        const data = await res.json();
        if (cancelled) return;
        setOrder(data.order);
        setItems(data.items || []);
        setIdPhotos(data.idPhotos || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (error || !order) return <div className="p-6 text-sm text-red-700">{error || 'Order not found'}</div>;

  return <OrderWizard order={order} items={items} idPhotos={idPhotos} basePath={basePath} />;
}
