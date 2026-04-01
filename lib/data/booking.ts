export type BookingService = {
  slug: string;
  name: string;
  shortDescription: string;
  /** Price in cents, null = quote-based */
  price: number | null;
  priceLabel: string;
  requiresReview: boolean;
  reviewReason?: string;
  /** Duration of the appointment slot in minutes */
  slotDurationMinutes: number;
};

/** Booking deposit fee (cents) charged upfront via Stripe, keyed by commissioner id */
export const BOOKING_FEES: Record<string, number> = {
  'raminder-shah': 4000,  // $40 — Downtown Calgary
  'amrita-shah': 3000,    // $30 — NE Calgary
};

/** Look up booking fee from DB (co_commissioners.booking_fee_cents), falling back to hardcoded map */
export async function getBookingFee(commissionerId: string): Promise<number> {
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase
    .from('co_commissioners')
    .select('booking_fee_cents')
    .eq('id', commissionerId)
    .single();

  if (data?.booking_fee_cents != null) {
    return data.booking_fee_cents;
  }
  return BOOKING_FEES[commissionerId] ?? 4000;
}

