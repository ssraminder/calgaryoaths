'use client';

import { Suspense } from 'react';
import OrdersList from '@/components/orders/OrdersList';

export default function AdminOrdersPage() {
  return <Suspense><OrdersList basePath="/admin/orders" /></Suspense>;
}
