# Vendor Direct Booking Page — Implementation Plan

## Overview

Public page at `/book/[vendorId]` (e.g. `/book/raminder-shah`) where customers
book directly with a specific vendor. Simplified flow — no location/vendor
selection needed since the vendor is pre-selected.

---

## Page: `/book/[vendorId]`

### URL examples
- `calgaryoaths.com/book/raminder-shah`
- `calgaryoaths.com/book/amrita-shah`

### Flow (3 steps instead of 4)

**Step 1 — Select Service**
- Show vendor profile header (name, title, location, languages, photo)
- List only services this vendor offers (from `co_commissioner_services`)
- Show vendor-specific price per service (from `co_vendor_rates`)
- Searchable if > 6 services

**Step 2 — Your Details + Time**
- Customer info: name, email, phone
- Delivery mode (In-Office / Mobile / Virtual) — only modes this vendor supports
- If mobile: address, facility, unit fields + travel fee calculator
- Slot picker (using existing SlotPicker component)
- Price breakdown

**Step 3 — Stripe Payment**
- Same flow as existing: create booking → schedule → Stripe checkout
- Redirect to success page after payment

### Key differences from main booking flow
- No Step 2 (location/vendor selection) — vendor is pre-selected from URL
- Vendor profile shown at top of every step
- Only shows services + rates for THIS vendor
- Only shows delivery modes this vendor supports
- Shareable link — vendors can send this to their clients

---

## API Changes

### New: `GET /api/booking/vendor-profile?vendorId=xxx`
Returns public vendor profile + their services with rates:
```json
{
  "vendor": {
    "id": "raminder-shah",
    "name": "Raminder Shah",
    "title": "Commissioner of Oaths",
    "location": "Downtown Calgary",
    "address": "421 7th Ave SW, #3000, Calgary, AB T2P 4K9",
    "languages": ["English", "Punjabi", "Hindi"],
    "credentials": ["Commissioner of Oaths (Alberta)"],
    "mobile_available": true,
    "virtual_available": true
  },
  "services": [
    {
      "slug": "affidavit-commissioning",
      "name": "Affidavit Commissioning",
      "price_cents": 3000,
      "additional_page_cents": 1500,
      "requires_review": false
    }
  ],
  "locationId": "downtown-calgary"
}
```

### Existing APIs (reused as-is)
- `GET /api/booking/slots?commissionerId=xxx&startDate=xxx` — time slots
- `POST /api/booking/create` — create booking
- `POST /api/booking/schedule` — schedule + Stripe checkout
- `GET /api/booking/travel-fee` — mobile travel fee

---

## Files to create

```
app/book/[vendorId]/page.tsx          — main page (metadata + layout)
components/booking/VendorBookingForm.tsx  — the 3-step form
app/api/booking/vendor-profile/route.ts  — vendor profile + services API
```

## Files to modify

```
components/shared/CommissionerCard.tsx  — add "Share booking link" option
app/vendor/page.tsx                     — show vendor's booking link
```

## Implementation notes

- Reuse existing `SlotPicker` component for time selection
- Reuse existing `BookingService` type
- Reuse existing booking create/schedule/Stripe flow
- Vendor profile header as a reusable component at top of form
- 404 page if vendor ID doesn't exist or is inactive
- SEO: dynamic metadata with vendor name + location
- Mobile-responsive — same styling as main booking modal
