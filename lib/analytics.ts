/** Google Analytics 4 + GTM + Google Ads event helpers for conversion tracking */

type AdsConfig = { id: string; bookingLabel: string | null; phoneLabel: string | null };

/** Read the Google Ads config injected by the root layout script tag. */
function getAdsConfig(): AdsConfig | null {
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).__ADS_CONFIG) {
    return (window as Record<string, unknown>).__ADS_CONFIG as AdsConfig;
  }
  return null;
}

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

  // Google Ads phone-call conversion is handled by GTM listening for
  // the 'phone_click' dataLayer event — do NOT also call gtag directly
  // here, as that would double-count the conversion.
  const cfg = getAdsConfig();
  pushDataLayer({
    event: 'phone_click',
    location,
    ads_send_to: cfg ? `${cfg.id}/${cfg.phoneLabel}` : undefined,
  });
}

/** Fire the Google Ads booking-confirmed conversion (call once on confirmation page).
 *  The actual gtag conversion call is handled by a GTM tag that triggers on the
 *  'booking_conversion' dataLayer event — do NOT also call gtag directly here,
 *  as that would double-count the conversion. */
export function trackBookingConversion() {
  const cfg = getAdsConfig();
  pushDataLayer({
    event: 'booking_conversion',
    ads_send_to: cfg ? `${cfg.id}/${cfg.bookingLabel}` : undefined,
  });
}
