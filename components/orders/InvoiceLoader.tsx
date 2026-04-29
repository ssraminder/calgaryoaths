'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoicePrintView from './InvoicePrintView';
import type { Order, OrderItem } from '@/lib/orders/types';

export default function InvoiceLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setOrder(d.order); setItems(d.items || []); } })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading invoice…</div>;
  if (!order) return <div className="p-6 text-sm text-red-700">Order not found</div>;

  return <InvoicePrintView order={order} items={items} autoPrint />;
}
