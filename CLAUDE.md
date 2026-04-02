@AGENTS.md

# Project Reference

## Booking System
- The site uses its **own booking system** with Stripe payments — NOT Calendly.
- Calendly is NOT used. Do not reference Calendly in any user-facing text, comments, or new code.
- Legacy `calendly_url` fields exist in the database (`co_commissioners`, `co_locations`) and admin forms but are unused by the booking flow.

## Google Ads Conversion Tracking
- Google Ads account: 631-615-9162 (AW-6316159162)
- Config is stored in `co_settings` table (keys: `google_ads_id`, `google_ads_booking_label`, `google_ads_phone_label`)
- Managed via /admin/settings, same pattern as `ga4_id` and `gtm_id`
- Phone number: (587) 600-0746 — do not use 5876000786 (that was a typo in Google Ads)

## Analytics Settings Flow
- All analytics IDs (GA4, GTM, Google Ads) are stored in `co_settings` table and read by `getAnalyticsSettings()` in `lib/data/db.ts`
- Layout injects Google Ads config as `window.__ADS_CONFIG` for client-side use
- `lib/analytics.ts` reads from `window.__ADS_CONFIG` at runtime
- Phone click tracking uses the `PhoneLink` component (or `trackPhoneClick()` in client components)
