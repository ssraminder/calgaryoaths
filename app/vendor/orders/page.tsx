'use client';

import { Suspense } from 'react';
import OrdersList from '@/components/orders/OrdersList';

export default function VendorOrdersPage() {
  return <Suspense><OrdersList basePath="/vendor/orders" /></Suspense>;
}
