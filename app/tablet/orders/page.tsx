'use client';

import { Suspense } from 'react';
import OrdersList from '@/components/orders/OrdersList';

export default function TabletOrdersPage() {
  return <Suspense><OrdersList basePath="/tablet/orders" /></Suspense>;
}
