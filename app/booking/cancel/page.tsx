// Booking cancellation page — server component wrapper for CancelBookingClient.
// Route: /booking/cancel?token=<cancel_token>
import type { Metadata } from 'next';
import { Suspense } from 'react';
import CancelBookingClient from './CancelBookingClient';

export const metadata: Metadata = {
  title: 'Cancel Booking | Calgary Oaths',
  robots: { index: false },
};

export default function CancelBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-mid-grey">Loading...</div>}>
      <CancelBookingClient />
    </Suspense>
  );
}
