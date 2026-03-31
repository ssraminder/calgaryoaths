import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingSuccessClient from './BookingSuccessClient';

export const metadata: Metadata = {
  title: 'Booking Confirmed | Calgary Oaths',
  robots: { index: false },
};

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-mid-grey">Loading…</div>}>
      <BookingSuccessClient />
    </Suspense>
  );
}
