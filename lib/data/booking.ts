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

