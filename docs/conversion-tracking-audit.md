# Google Ads Conversion Tracking Audit

**Date:** 2026-04-02
**Site:** calgaryoaths.com

---

## Summary

**Overall status: Broken / Partially working**

Conversion tracking is wired up in code but has two critical issues:
1. The `google_ads_id` stored in Supabase is likely `AW-6316159162` (the customer account ID) instead of `AW-366617885` (the correct conversion tracking ID). This means the gtag config call and all conversion events are sent to the wrong ID.
2. Both `trackBookingConversion()` and `trackPhoneClick()` were firing conversions via direct `gtag()` calls AND pushing to the GTM dataLayer — causing double-counted conversions if GTM also has conversion tags configured (which the setup guide instructs).

---

## Configuration found in code

| Setting | Value | Source |
|---|---|---|
| Google Ads ID loaded | Dynamic from `co_settings.google_ads_id` | Supabase DB, fallback to `NEXT_PUBLIC_GOOGLE_ADS_ID` env var |
| Script loading method | Both — GTM via `GoogleTagManager.tsx` AND direct gtag.js via layout `<Script>` | `app/layout.tsx:76-100` |
| GTM Container | `GTM-KCZCD8V5` (from `co_settings.gtm_id`) | `components/shared/GoogleTagManager.tsx` |
| GA4 Property | `G-Y0N38H6GCY` (from `co_settings.ga4_id`) | `@next/third-parties/google` `<GoogleAnalytics>` |
| Booking label in Supabase | **UNKNOWN** — cannot query Supabase from code. Docs suggest it should be `UyijCLK45IkbEJ3K6K4B` | Must verify at `/admin/settings` |
| Phone label in Supabase | **UNKNOWN** — likely not set (described as "pending" in task) | Must verify at `/admin/settings` |
| Conversion Linker | **Not found** in codebase — should be handled by GTM | N/A |

---

## trackBookingConversion() — how it fires

**Location:** `lib/analytics.ts:108-114`

**Before fix (double-firing):**
```typescript
export function trackBookingConversion() {
  const cfg = getAdsConfig();
  if (cfg?.bookingLabel && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${cfg.id}/${cfg.bookingLabel}`,
    });
  }
  pushDataLayer({ event: 'booking_conversion' });
}
```
- Method: **Both** direct gtag AND dataLayer push
- Risk: **Double counting YES** — if GTM has a "Google Ads Conversion" tag triggered by the `booking_conversion` custom event (which the setup guide instructs to create), the conversion fires twice.

**After fix (dataLayer only):**
```typescript
export function trackBookingConversion() {
  const cfg = getAdsConfig();
  pushDataLayer({
    event: 'booking_conversion',
    ads_send_to: cfg ? `${cfg.id}/${cfg.bookingLabel}` : undefined,
  });
}
```
- Method: **dataLayer push only** — GTM handles the conversion tag
- `ads_send_to` is passed as a dataLayer variable so the GTM tag can use it as `{{DLV - ads_send_to}}`

**Trigger:** Called from `BookingSuccessClient.tsx` useEffect, only when `searchParams.get('appointment') === 'confirmed'`.

---

## trackPhoneClick() — how it fires

**Location:** `lib/analytics.ts:92-106`

**Before fix (double-firing):**
```typescript
export function trackPhoneClick(location: string) {
  trackEvent('phone_click', { event_category: 'contact', event_label: location });
  pushDataLayer({ event: 'phone_click', location });
  const phoneCfg = getAdsConfig();
  if (phoneCfg?.phoneLabel && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${phoneCfg.id}/${phoneCfg.phoneLabel}`,
    });
  }
}
```
- Method: **Both** direct gtag AND dataLayer push
- Risk: **Double counting YES** if GTM has a phone conversion tag on `phone_click`

**After fix (dataLayer only):**
```typescript
export function trackPhoneClick(location: string) {
  trackEvent('phone_click', { event_category: 'contact', event_label: location });
  const cfg = getAdsConfig();
  pushDataLayer({
    event: 'phone_click',
    location,
    ads_send_to: cfg ? `${cfg.id}/${cfg.phoneLabel}` : undefined,
  });
}
```

**Trigger:** Called from `PhoneLink` component onClick and inline phone links.

---

## Booking success page — conversion trigger

**Location:** `app/booking/success/BookingSuccessClient.tsx:10-17`

```typescript
const params = useSearchParams();
const confirmed = params.get('appointment') === 'confirmed';

useEffect(() => {
  if (confirmed) {
    trackBookingConversion();
  }
}, [confirmed]);
```

- URL parameter check: **YES** — only fires when `?appointment=confirmed` is present
- False conversion risk: **Low** — without the parameter, it shows "Invalid booking link" and does NOT fire

---

## Issues found

### CRITICAL: Wrong Google Ads ID (Issue A)

The existing documentation (`docs/claude-cowork-google-ads-setup.md`, old `CLAUDE.md`) references `AW-6316159162` as the Google Ads ID. This is the **customer account ID** (631-615-9162), not the conversion tracking ID. The correct value for gtag loading and conversion `send_to` is **`AW-366617885`**.

If Supabase `co_settings.google_ads_id` is set to `AW-6316159162`:
- The gtag.js script loads with the wrong ID
- `gtag('config', 'AW-6316159162')` configures the wrong property
- All conversion events send to the wrong ID and are silently dropped
- **No conversions will ever be recorded in Google Ads**

### CRITICAL: Booking conversion label may not be set (Issue B)

If `co_settings.google_ads_booking_label` is empty/null in Supabase, `window.__ADS_CONFIG.bookingLabel` will be null, and the `ads_send_to` value in the dataLayer push will be `AW-366617885/null` — which is invalid and won't track.

### WARNING: Double-firing conversions (Issue C) — FIXED

Both `trackBookingConversion()` and `trackPhoneClick()` were calling `window.gtag('event', 'conversion', ...)` directly AND pushing to `window.dataLayer`. If GTM has conversion tags listening for these events (as the setup guide instructs), each conversion would be counted twice.

**Fix applied:** Removed direct `gtag()` conversion calls. Only `pushDataLayer()` is used now — GTM handles the actual conversion tag firing.

### WARNING: Phone conversion label not yet configured (Issue B)

The phone conversion label is described as "pending" — it hasn't been created in Google Ads yet or entered in Supabase settings. Phone click conversions will not be tracked until this is set.

### INFO: No Conversion Linker found in code

Google Ads requires a Conversion Linker tag to read the `gclid` parameter from ad click URLs. This is typically handled by GTM (which should have a "Conversion Linker" tag firing on all pages). Verify this exists in the GTM container `GTM-KCZCD8V5`.

### INFO: gtag config call exists

The layout correctly calls `gtag('config', gadsId)` — this is required for conversion tracking to work. No fix needed here, but it will use whatever value is in `co_settings.google_ads_id`.

---

## Fixes applied

1. **Removed direct gtag conversion calls from `trackBookingConversion()`** (`lib/analytics.ts`)
   - Now only pushes `booking_conversion` event to dataLayer with `ads_send_to` variable
   - GTM handles the actual Google Ads conversion tag

2. **Removed direct gtag conversion calls from `trackPhoneClick()`** (`lib/analytics.ts`)
   - Now only pushes `phone_click` event to dataLayer with `ads_send_to` variable
   - GTM handles the actual Google Ads conversion tag

3. **Updated `CLAUDE.md`**
   - Clarified the difference between customer ID (631-615-9162) and conversion tracking ID (AW-366617885)
   - Added booking conversion label reference
   - Noted that conversions are handled via GTM dataLayer events

---

## Remaining manual steps

These cannot be done from the codebase and must be completed in Supabase and/or the Google Ads / GTM UIs:

### 1. Update Supabase `co_settings` (via /admin/settings)

| Key | Required Value |
|---|---|
| `google_ads_id` | `AW-366617885` |
| `google_ads_booking_label` | `UyijCLK45IkbEJ3K6K4B` |
| `google_ads_phone_label` | *(create the conversion action in Google Ads first, then enter the label)* |

### 2. Create phone conversion action in Google Ads

- Go to Google Ads > Goals > Conversions > New conversion action
- Name: "Call Calgary Oaths (587-600-0746)"
- Category: Phone call lead
- Type: Website (click-to-call)
- Value: $20 CAD
- Count: One per click
- Copy the conversion label and enter it in `/admin/settings` as `google_ads_phone_label`

### 3. Verify GTM container (GTM-KCZCD8V5) has these tags

| Tag | Type | Trigger |
|---|---|---|
| Google Ads Conversion — Booking | Google Ads Conversion Tracking | Custom Event: `booking_conversion` |
| Google Ads Conversion — Phone | Google Ads Conversion Tracking | Custom Event: `phone_click` |
| Conversion Linker | Conversion Linker | All Pages |

For both conversion tags:
- Conversion ID: `AW-366617885`
- Conversion Label: Use `{{DLV - ads_send_to}}` data layer variable, OR hardcode the label
- Alternatively: Use the `ads_send_to` dataLayer variable directly in the tag's `send_to` field

### 4. Verify Google Ads auto-tagging is enabled

- Google Ads > Settings > Account Settings > Auto-tagging: ON
- This ensures `gclid` parameters are appended to ad click URLs

### 5. Test the full flow

After updating settings:
1. Use [Google Tag Assistant](https://tagassistant.google.com/) to verify tags fire
2. Complete a test booking and check `/booking/success?appointment=confirmed`
3. Verify the conversion appears in Google Ads > Goals > Conversions (may take up to 24h)
4. Click a phone link and verify the phone conversion fires in Tag Assistant
