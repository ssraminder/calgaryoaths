'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function BookingRespondPage() {
  return (
    <Suspense>
      <BookingRespondContent />
    </Suspense>
  );
}

function BookingRespondContent() {
  const searchParams = useSearchParams();
  const result = searchParams.get('result');

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md text-center">
        {result === 'accepted' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <CheckCircle className="h-8 w-8 text-teal" />
            </div>
            <h1 className="font-display text-2xl font-bold text-charcoal">Booking Confirmed!</h1>
            <p className="text-mid-grey">
              Your appointment has been confirmed at the new time. You'll receive a confirmation email shortly.
            </p>
          </div>
        )}

        {result === 'refunded' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-charcoal">Refund Requested</h1>
            <p className="text-mid-grey">
              Your booking has been cancelled and a refund has been initiated. It may take 5-10 business days to appear on your statement.
            </p>
          </div>
        )}

        {!result && (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-bold text-charcoal">Invalid Link</h1>
            <p className="text-mid-grey">This link is invalid or has already been used.</p>
          </div>
        )}

        <Link href="/" className="mt-8 inline-block rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
          Back to Calgary Oaths
        </Link>
      </div>
    </div>
  );
}
