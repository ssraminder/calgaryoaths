/** Google Analytics 4 + GTM + Google Ads event helpers for conversion tracking */

/* ── Google Ads conversion IDs ───────────────────────────────────────
 *  Account 631-615-9162  →  AW-6316159162
 *  Conversion labels come from Google Ads → Goals → Conversions → Tag setup.
 *  Open each conversion action, click "Use Google Tag Manager", and copy
 *  the label value shown (e.g. "AbC1dEfGhIjKlMnO").
 *  Replace the placeholders below with those real labels.
 * ──────────────────────────────────────────────────────────────────── */
export const GOOGLE_ADS_ID = 'AW-6316159162';
/** Label for "Oath Commissioner Online Booking" conversion action */
export const BOOKING_CONVERSION_LABEL = 'REPLACE_WITH_BOOKING_LABEL';
/** Label for "Call (587-600-0746)" conversion action */
export const PHONE_CONVERSION_LABEL = 'REPLACE_WITH_PHONE_LABEL';

type GtagEvent = {
  event_category?: string;
  event_label?: string;
  value?: number;
  currency?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

/** Send a GA4 event via gtag */
export function trackEvent(eventName: string, params?: GtagEvent) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/** Push an event to the GTM dataLayer */
export function pushDataLayer(data: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
}

/* ── Pre-defined booking funnel events ─────────────────────────────────── */

export function trackBookingModalOpen() {
  trackEvent('booking_modal_open', { event_category: 'booking' });
  pushDataLayer({ event: 'booking_modal_open' });
}

export function trackServiceSelected(serviceName: string) {
  trackEvent('service_selected', {
    event_category: 'booking',
    event_label: serviceName,
  });
  pushDataLayer({ event: 'service_selected', service_name: serviceName });
}

export function trackBookingCreated(serviceName: string, commissionerId: string) {
  trackEvent('booking_created', {
    event_category: 'booking',
    event_label: serviceName,
    commissioner_id: commissionerId,
  });
  pushDataLayer({
    event: 'booking_created',
    service_name: serviceName,
    commissioner_id: commissionerId,
  });
}

export function trackSlotConfirmed(bookingFee: number) {
  const value = bookingFee / 100; // cents → dollars
  trackEvent('begin_checkout', {
    event_category: 'booking',
    value,
    currency: 'CAD',
  });
  pushDataLayer({ event: 'begin_checkout', value, currency: 'CAD' });
}

export function trackConversion(bookingFee: number) {
  const value = bookingFee / 100;
  trackEvent('purchase', {
    event_category: 'booking',
    value,
    currency: 'CAD',
    transaction_id: `booking_${Date.now()}`,
  });
  pushDataLayer({ event: 'purchase', value, currency: 'CAD' });
}

export function trackPhoneClick(location: string) {
  trackEvent('phone_click', {
    event_category: 'contact',
    event_label: location,
  });
  pushDataLayer({ event: 'phone_click', location });

  // Fire Google Ads phone-call conversion
  if (typeof window !== 'undefined' && window.gtag && PHONE_CONVERSION_LABEL !== 'REPLACE_WITH_PHONE_LABEL') {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${PHONE_CONVERSION_LABEL}`,
    });
  }
}

/** Fire the Google Ads booking-confirmed conversion (call once on confirmation page) */
export function trackBookingConversion() {
  if (typeof window !== 'undefined' && window.gtag && BOOKING_CONVERSION_LABEL !== 'REPLACE_WITH_BOOKING_LABEL') {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${BOOKING_CONVERSION_LABEL}`,
    });
  }
  pushDataLayer({ event: 'booking_conversion' });
}
