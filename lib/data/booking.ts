export type BookingService = {
  slug: string;
  name: string;
  shortDescription: string;
  /** Price in cents, null = quote-based */
  price: number | null;
  priceLabel: string;
  requiresReview: boolean;
  reviewReason?: string;
};

/** Booking deposit fee (cents) charged upfront via Stripe, keyed by commissioner id */
export const BOOKING_FEES: Record<string, number> = {
  'raminder-shah': 4000,  // $40 — Downtown Calgary
  'amrita-shah': 3000,    // $30 — NE Calgary
};

export const bookingServices: BookingService[] = [
  {
    slug: 'affidavit',
    name: 'Affidavit Drafting & Commissioning',
    shortDescription: 'Sworn statement drafted and commissioned with official seal.',
    price: 4000,
    priceLabel: 'From $40',
    requiresReview: false,
  },
  {
    slug: 'statutory-declaration',
    name: 'Statutory Declaration',
    shortDescription: 'Written confirmation of facts for legal or government use.',
    price: 3500,
    priceLabel: 'From $35',
    requiresReview: false,
  },
  {
    slug: 'travel-consent-letter',
    name: 'Travel Consent Letter',
    shortDescription: 'Commissioned permission for a child travelling without one or both parents.',
    price: 4000,
    priceLabel: 'From $40',
    requiresReview: false,
  },
  {
    slug: 'invitation-letter',
    name: 'Invitation Letter (IRCC)',
    shortDescription: 'Commissioned letter supporting a Canadian visitor visa application.',
    price: 4500,
    priceLabel: 'From $45',
    requiresReview: false,
  },
  {
    slug: 'document-drafting',
    name: 'Document Drafting',
    shortDescription: 'We draft affidavits, statutory declarations, travel consent letters, and invitation letters from scratch.',
    price: null,
    priceLabel: 'From $100/hour',
    requiresReview: true,
    reviewReason: 'Document drafting requires us to understand your needs before confirming. We will contact you within 2 hours to discuss and confirm.',
  },
  {
    slug: 'true-copy-attestation',
    name: 'True Copy Attestation',
    shortDescription: 'Certified copy of an original document attested by a commissioner.',
    price: null,
    priceLabel: 'From $20',
    requiresReview: true,
    reviewReason: 'True copy attestations require us to review the original document before confirming. We will contact you within 2 hours.',
  },
  {
    slug: 'apostille-legalization',
    name: 'Apostille & Document Legalization',
    shortDescription: 'Authentication of Canadian documents for international use.',
    price: null,
    priceLabel: 'Quote on request',
    requiresReview: true,
    reviewReason: 'Apostille services require document review before confirmation. We will contact you within 2 hours with pricing and availability.',
  },
  {
    slug: 'mobile-service',
    name: 'Mobile Commissioning Service',
    shortDescription: 'We come to your home, office, hospital, or care facility.',
    price: null,
    priceLabel: 'From $30 + travel fee',
    requiresReview: true,
    reviewReason: 'Mobile bookings require travel confirmation and scheduling. We will contact you within 2 hours to confirm your appointment.',
  },
];
