# Admin Panel — Implementation Plan

## Context

Calgary Oaths is a production Next.js 14 booking site for commissioner of oaths services in Calgary. Currently there is **no admin UI** — all administrative work (reviewing bookings, managing commissioners, checking payments) is done via the Supabase dashboard or email notifications to `info@calgaryoaths.com`. This plan adds a full admin panel to manage bookings, manual reviews, vendors (commissioners/notaries), services, locations, analytics, and site settings.

## Environment Variables Required

Add to **Netlify Environment Variables** (Settings > Environment Variables):

| Variable | Purpose | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin DB operations (bypasses RLS) | Supabase Dashboard > Project Settings > API > service_role key |

Already configured (no changes needed):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe
- `BREVO_API_KEY` — Email

---

## Phase 1: Database Migrations

Run via **Supabase MCP** (next session) or in the Supabase SQL Editor.

### New Tables

```sql
-- Admin profiles linked to Supabase Auth
CREATE TABLE co_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE co_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON co_profiles
  FOR SELECT USING (auth.uid() = id);

-- Audit trail for manual review actions
CREATE TABLE co_review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES co_bookings(id),
  action TEXT NOT NULL CHECK (action IN ('approved','rejected','info_requested')),
  admin_user_id UUID REFERENCES co_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partner/vendor applications (replaces email-only flow)
CREATE TABLE co_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  credential_types TEXT,
  year_credentialed TEXT,
  credentials_active TEXT,
  insurance TEXT,
  services_offered TEXT,
  mobile_available TEXT,
  languages TEXT,
  postal_code TEXT,
  service_radius TEXT,
  availability TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','approved','declined')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Altered Tables

```sql
-- Add admin fields to bookings
ALTER TABLE co_bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE co_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE co_bookings ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- New valid statuses: pending_review, pending_scheduling, pending_payment,
-- paid, confirmed, cancelled, no_show, completed, rejected

-- Move booking fees from hardcoded to DB
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS booking_fee_cents INTEGER DEFAULT 4000;

-- Set current values
UPDATE co_commissioners SET booking_fee_cents = 4000 WHERE id = 'raminder-shah';
UPDATE co_commissioners SET booking_fee_cents = 3000 WHERE id = 'amrita-shah';
```

---

## Phase 2: Auth Foundation + Admin Layout

### Files to Create

**Supabase admin client:**
- `lib/supabase-server.ts` — Server-side client using `SUPABASE_SERVICE_ROLE_KEY` for admin operations

**Middleware:**
- `middleware.ts` — Protects `/admin/*` routes (except `/admin/login`), redirects unauthenticated users to `/admin/login`

**Admin layout (isolated from public site):**
- `app/admin/layout.tsx` — No Navbar/Footer/BookingModal. Own sidebar + topbar. Auth gate.
- `app/admin/login/page.tsx` — Email/password login form using Supabase Auth `signInWithPassword`

**Admin components:**
- `components/admin/Sidebar.tsx` — Navigation: Dashboard, Bookings, Reviews, Vendors, Services, Locations, Analytics, Settings. Badge counts for pending items.
- `components/admin/TopBar.tsx` — Current user name, logout button
- `components/admin/StatCard.tsx` — Reusable KPI card
- `components/admin/DataTable.tsx` — Reusable sortable/filterable table component
- `components/admin/StatusBadge.tsx` — Color-coded booking status badge
- `components/admin/Pagination.tsx` — Pagination controls

### Files to Modify
- `lib/data/booking.ts` — Update `BOOKING_FEES` lookup to fall back to DB value from `co_commissioners.booking_fee_cents`
- `app/api/booking/schedule/route.ts` — Read `booking_fee_cents` from commissioner record instead of hardcoded map

---

## Phase 3: Dashboard

### Files to Create
- `app/admin/page.tsx` — Dashboard page

**Dashboard content:**
- **KPI row:** Today's bookings, pending reviews (highlighted), monthly revenue (sum `amount_paid`), monthly total bookings
- **Recent activity:** Last 10 bookings table with status, service, customer, timestamp, quick-view link
- **Pending reviews alert:** If count > 0, prominent CTA to review queue

### API Routes
- `app/api/admin/stats/route.ts` — GET: returns KPI data (counts, sums) with date range params

---

## Phase 4: Booking Management

### Files to Create
- `app/admin/bookings/page.tsx` — Booking list with filters
- `app/admin/bookings/[id]/page.tsx` — Booking detail + actions

**List features:**
- Table: ID (truncated), customer name/email, service, commissioner, appointment datetime, status badge, amount, created_at
- Filters: status (multi-select), date range, commissioner, service, free-text search
- CSV export button
- Pagination (20 per page)

**Detail features:**
- All booking fields displayed
- Status change dropdown (with valid transitions)
- Cancel button (sets `cancelled` status + `cancelled_at` + reason, optionally triggers Stripe refund)
- Internal notes editor (`admin_notes` field)
- Send reminder email button
- Link to Stripe payment (if exists)

### API Routes
- `app/api/admin/bookings/route.ts` — GET: list with filters/pagination/search
- `app/api/admin/bookings/[id]/route.ts` — GET: detail, PATCH: update status/notes
- `app/api/admin/bookings/[id]/cancel/route.ts` — POST: cancel + optional Stripe refund
- `app/api/admin/bookings/export/route.ts` — GET: CSV download

---

## Phase 5: Manual Review Queue

### Files to Create
- `app/admin/reviews/page.tsx` — Filtered view of `status = 'pending_review'` bookings

**Per review card:**
- Customer info (name, email, phone)
- Service + review reason (from `co_services.review_reason`)
- Customer notes, num_documents
- Time since submission
- Actions: Approve, Reject, Request Info

**Actions detail:**
- **Approve** → status changes to `pending_scheduling`, email sent to customer
- **Reject** → status changes to `rejected`, email sent with reason
- **Request Info** → email sent to customer, status stays `pending_review`

### API Routes
- `app/api/admin/reviews/[id]/action/route.ts` — POST: approve/reject/request-info, creates `co_review_actions` audit record, sends email via `lib/email.ts`

---

## Phase 6: Vendor Management

### Files to Create
- `app/admin/vendors/page.tsx` — Commissioner list + partner applications tab
- `app/admin/vendors/new/page.tsx` — Add new commissioner form
- `app/admin/vendors/[id]/page.tsx` — Edit commissioner

**Commissioner form fields (maps to `co_commissioners`):**
- name, title, bio, location, location_slug, address, phone, email
- calendly_url, languages (tag input), credentials (tag input)
- hours_weekdays, hours_saturday, hours_sunday
- google_maps_embed, map_url, areas_served (tag input), nearby_neighbourhoods (tag input)
- booking_fee_cents (number input, displayed as dollars)
- Services offered (checkboxes from `co_services` → writes to `co_commissioner_services`)
- active toggle, sort_order

**Partner applications tab:**
- Table of `co_partner_applications` with status filter
- Detail view with approve/decline/contact actions

### API Routes
- `app/api/admin/vendors/route.ts` — GET: list, POST: create
- `app/api/admin/vendors/[id]/route.ts` — GET, PATCH, DELETE (soft: set active=false)
- `app/api/admin/applications/route.ts` — GET: list
- `app/api/admin/applications/[id]/route.ts` — PATCH: update status/notes

### Files to Modify
- `app/actions/join.ts` — Also insert into `co_partner_applications` table (in addition to sending email)

---

## Phase 7: Service & Location Management

### Files to Create
- `app/admin/services/page.tsx` — Service list with active toggles
- `app/admin/services/[slug]/page.tsx` — Edit service
- `app/admin/locations/page.tsx` — Location list
- `app/admin/locations/[id]/page.tsx` — Edit location

**Service form fields:** name, slug, short_description, price (cents), price_label, requires_review, review_reason, slot_duration_minutes, display_order, active

**Location form fields:** name, commissioner_id (dropdown), address, phone, parking_notes, nearby_neighbourhoods, google_maps_embed, map_url, calendly_url, hours, geo_lat, geo_lng, active, sort_order

### API Routes
- `app/api/admin/services/route.ts` — GET, POST
- `app/api/admin/services/[slug]/route.ts` — GET, PATCH
- `app/api/admin/locations/route.ts` — GET, POST
- `app/api/admin/locations/[id]/route.ts` — GET, PATCH

---

## Phase 8: Analytics & Settings

### Files to Create
- `app/admin/analytics/page.tsx` — Analytics dashboard
- `app/admin/settings/page.tsx` — Site settings editor

**Analytics (all queried from `co_bookings`):**
- Bookings over time (daily/weekly/monthly) — bar chart
- Revenue over time — line chart
- Bookings by service — donut chart
- Bookings by commissioner — donut chart
- Conversion funnel: created → paid → confirmed
- Date range filter, commissioner filter, service filter

**Charts library:** `recharts` (add as dependency)

**Settings page:** Edit `co_settings` key-value pairs:
- ga4_id, gtm_id, starting_price
- Future: contact email, WhatsApp number, default slot duration, days ahead

### API Routes
- `app/api/admin/analytics/route.ts` — GET: aggregated stats with date range
- `app/api/admin/settings/route.ts` — GET, PATCH

---

## New NPM Packages

```bash
npm install @supabase/ssr recharts
```

- `@supabase/ssr` — Server-side Supabase auth helpers for Next.js App Router (cookie-based sessions)
- `recharts` — Charts for analytics dashboard

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth | Supabase Auth (email/password) + `co_profiles` role | Already using Supabase; no new provider |
| Admin route isolation | `app/admin/` with own `layout.tsx` | Avoids public Navbar/Footer; clean separation |
| Server client | Service role key in `lib/supabase-server.ts` | Bypasses RLS for admin operations |
| Data tables | Custom Tailwind components | Keeps bundle light; matches existing patterns |
| Charts | `recharts` | React-native, tree-shakeable, well-maintained |
| API auth | All `/api/admin/*` routes verify Supabase session + admin role | Consistent security gate |
| Booking fees | Migrate to `co_commissioners.booking_fee_cents` | Eliminates hardcoded values; scales to N commissioners |

---

## File Summary

### New Files (~35)
- `middleware.ts`
- `lib/supabase-server.ts`
- `app/admin/layout.tsx`, `login/page.tsx`, `page.tsx` (dashboard)
- `app/admin/bookings/page.tsx`, `[id]/page.tsx`
- `app/admin/reviews/page.tsx`
- `app/admin/vendors/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- `app/admin/services/page.tsx`, `[slug]/page.tsx`
- `app/admin/locations/page.tsx`, `[id]/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/settings/page.tsx`
- `components/admin/` (Sidebar, TopBar, StatCard, DataTable, StatusBadge, Pagination)
- `app/api/admin/` (~14 route files)

### Modified Files (~3)
- `lib/data/booking.ts` — Fallback to DB for fees
- `app/api/booking/schedule/route.ts` — Read fee from DB
- `app/actions/join.ts` — Also write to `co_partner_applications`

---

## Verification Plan

1. **Auth:** Create admin user in Supabase Auth dashboard → login at `/admin/login` → verify redirect to dashboard
2. **Dashboard:** Verify KPI cards show correct counts from `co_bookings`
3. **Bookings:** Filter by status/date/commissioner → view detail → change status → verify DB update
4. **Reviews:** Create a booking with `requires_review` service → appears in queue → approve → status changes + email sent
5. **Vendors:** Create new commissioner → assign services → verify appears in public booking flow
6. **Booking fees:** After migrating to DB, verify Stripe checkout uses commissioner's `booking_fee_cents`
7. **Analytics:** Verify chart data matches raw booking counts
8. **Settings:** Change GA4 ID → verify updated in page source
9. **Netlify deployment:** Build succeeds, middleware runs correctly, env vars accessible
