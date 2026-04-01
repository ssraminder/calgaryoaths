# Calgary Oaths — Development Progress & Plan

## Session Summary (April 2026)

### Completed Features

#### Pricing System
- [x] Dynamic pricing from `co_vendor_rates` — public pages show lowest vendor rate as "From $X"
- [x] Per-vendor service pricing with suggested rates (company rate - 20%, rounded to $5)
- [x] Minimum vendor rate enforcement (`co_services.min_vendor_rate_cents` = 75% of suggested)
- [x] Service pricing table in admin vendor edit with offer toggle, suggested rates, copy-to-vendor action
- [x] Price removed from booking Step 1 — customers see vendor-specific prices in Step 2
- [x] Drafting copy updated sitewide: "commissioning · drafting available at extra charge"

#### Vendor Management
- [x] Tag-based inputs for languages (19 presets), credentials (6 presets), neighbourhoods (60+ presets)
- [x] Merged "Areas Served" and "Nearby Neighbourhoods" into single field
- [x] Services + pricing merged into one table (removed separate checkboxes)
- [x] GST/HST registration (number + registered flag) with 5% GST added to vendor payouts
- [x] Mobile and Virtual service toggles per vendor
- [x] Availability rules: bulk day selection (Weekdays/Weekends/All), location auto-resolve
- [x] Blocked dates: date range picker, red pill display, booking slots respect blocked dates
- [x] Vendor payout display: shows service payout + GST breakdown (not total charged to customer)
- [x] Hours removed from public pages — "By appointment only" everywhere

#### Booking Flow
- [x] Delivery mode selection in Step 2 (In-Office / Mobile / Virtual) with vendor filtering
- [x] Delivery mode cards show vendor/location counts per mode
- [x] Smart back button (delivery mode → Step 1 navigation)
- [x] Area/neighbourhood/postal code search filter for in-office locations
- [x] Mobile booking: facility name + unit/room fields, distance-based travel fee
- [x] Virtual booking: info banner, video call notice in Step 3

#### Appointment Completion (Payout Phase 1)
- [x] `co_appointment_documents` table — customer ID + commissioned document uploads
- [x] `co_payout_batches` table — weekly payout batch tracking
- [x] Supabase Storage bucket: `appointment-documents` (private, 10MB, jpg/png/pdf/heic)
- [x] Vendor upload APIs: POST upload, DELETE, GET documents
- [x] Vendor complete API: validates both upload types exist before marking complete
- [x] DocumentUpload component: drag-to-upload zones, thumbnail list, delete buttons
- [x] "Mark as Complete" button on vendor booking detail (disabled until uploads present)
- [x] Read-only upload view after completion

#### Join / Vendor Registration (`/join`)
- [x] Auto-creates Supabase auth account + vendor profile (inactive, admin approves)
- [x] Credential certificate upload (scan/photo stored in Supabase Storage)
- [x] Credential hierarchy auto-selection (Notary → includes Commissioner)
- [x] TagInput for languages and areas served
- [x] GST/HST dropdown (registered/not registered) + number field
- [x] "Other services" text field for services not in catalog
- [x] "How did you hear about us?" referral source dropdown
- [x] Welcome email to vendor + notification email to admin
- [x] Pricing/hours removed (configured in partner portal after approval)

#### Data & Addresses
- [x] Downtown: 421 7th Ave SW, #3000, Calgary, AB T2P 4K9
- [x] NE Calgary: 220 Red Sky Terrace NE, Calgary, AB T3N 1M9
- [x] Updated in: Supabase (co_commissioners + co_locations), hardcoded fallbacks, location detail pages, homepage JSON-LD, meta descriptions, Google Maps URLs
- [x] Supabase-driven: locations page, footer, about page, home LocationsSection (with fallback)
- [x] Service prices updated to market benchmarks (Statutory $45, Power of Attorney $80, etc.)
- [x] Merged "True Copy Attestation" into "Certified True Copy"

#### Google Integrations
- [x] Google Places autocomplete for admin address fields (vendor + location edit)
- [x] Geocode API: auto-fills lat/lng + Google Maps embed/link URLs
- [x] Google Reviews via Places API (New) — live reviews on homepage, 1hr cache
- [x] Distance Matrix API for mobile travel fee calculation (already existed)

#### SEO & Redirects
- [x] `public/_redirects` with 80+ WordPress migration rules (pages, blog posts, categories, tags, authors, wp-system URLs)
- [x] Removed duplicate redirects from `netlify.toml`
- [x] Trust bar converted to CSS marquee animation (no scrollbar)

#### Email
- [x] Sender email: `noreply@cethos.com` (via Brevo API)
- [x] Vendor welcome email on registration
- [x] Admin notification email on vendor application (with credential file link)

---

### Deferred — Build When External Vendors Join

#### Payout Dashboard (Phase 2)
- [ ] `/admin/payouts` page with summary cards (eligible/processing/paid totals)
- [ ] Weekly batch generation: group eligible bookings per vendor per Mon–Sun period
- [ ] Batch detail: expand to see individual bookings
- [ ] "Mark Batch as Paid" with payment method + reference number
- [ ] Bulk actions: "Pay All Eligible", "Export CSV"
- [ ] GST totals per batch (`gst_cents`, `total_with_gst_cents` columns ready)

#### Vendor Payout History (Phase 3)
- [ ] `/vendor/payouts` page with earnings summary (this week / month / all time)
- [ ] Payout history table: period, bookings, amount, status, reference
- [ ] Click batch to see individual bookings

#### Stripe Connect (Optional Future)
- [ ] Express account onboarding per vendor
- [ ] Auto-transfer on batch payment
- [ ] `co_commissioners.stripe_account_id` column

---

### DB Tables Created This Session

| Table | Purpose |
|---|---|
| `co_appointment_documents` | Customer ID + commissioned document uploads per booking |
| `co_payout_batches` | Weekly payout batch tracking per vendor |
| `co_blocked_dates` | Vendor date blocking (holidays, time off) |

### Columns Added This Session

| Table | Column | Type |
|---|---|---|
| `co_services` | `min_vendor_rate_cents` | integer |
| `co_commissioners` | `gst_number` | text |
| `co_commissioners` | `gst_registered` | boolean |
| `co_bookings` | `completed_at` | timestamptz |
| `co_bookings` | `completion_notes` | text |
| `co_bookings` | `payout_status` | text |
| `co_bookings` | `payout_reference` | text |
| `co_bookings` | `payout_paid_at` | timestamptz |
| `co_bookings` | `payout_batch_id` | uuid |
| `co_bookings` | `vendor_gst_cents` | integer |
| `co_bookings` | `vendor_total_payout_cents` | integer |
| `co_bookings` | `facility_name` | text |
| `co_bookings` | `facility_type` | text |
| `co_bookings` | `customer_unit` | text |
| `co_partner_applications` | `areas_served` | text |
| `co_partner_applications` | `gst_number` | text |
| `co_partner_applications` | `gst_registered` | boolean |
| `co_partner_applications` | `referral_source` | text |
| `co_partner_applications` | `credential_file_url` | text |
| `co_partner_applications` | `commissioner_id` | text |
| `co_partner_applications` | `user_id` | uuid |
| `co_partner_applications` | `status` | text |
| `co_partner_applications` | `other_services` | text |
