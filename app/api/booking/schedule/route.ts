import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSessionForBooking } from '@/lib/booking-checkout';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, appointmentDatetime } = await req.json();

    if (!bookingId || !appointmentDatetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await createCheckoutSessionForBooking(bookingId, appointmentDatetime);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if ('paymentTransferred' in result && result.paymentTransferred) {
      return NextResponse.json({ paymentTransferred: true });
    }

    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (err) {
    console.error('Schedule error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
