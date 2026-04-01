# Admin Panel Plan — Calgary Oaths

## Current State Summary

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL), Stripe, Calendly, Brevo email, Tailwind CSS, deployed on Netlify.

**Database Tables (Supabase `co_` prefix):**
| Table | Purpose |
|---|---|
| `co_bookings` | Booking records with status workflow: `pending_review → pending_scheduling → pending_payment → paid → confirmed` |
| `co_services` | 6 services (affidavit, statutory-declaration, travel-consent-letter, invitation-letter, apostille-legalization, mobile-service) with `requires_review` flag |
| `co_commissioners` | Commissioner profiles (currently 2: Raminder Shah, Amrita Shah) |
| `co_locations` | Physical locations tied to commissioners |
| `co_commissioner_services` | Junction table: which commissioner offers which service |
| `co_settings` | Key-value config (GA4 ID, GTM ID, starting_price) |

**What exists today:** Public booking site only. No auth, no admin UI. Manual review bookings trigger an email to `info@calgaryoaths.com`. Everything admin-related is done directly in the Supabase dashboard.

---

## Admin Panel Architecture

### Route Structure

All admin pages live under `/app/admin/` with a shared layout providing sidebar navigation, auth gate, and consistent styling.

```
/app/admin/
├── layout.tsx                    # Auth gate + sidebar + top bar
├── page.tsx                      # Dashboard (overview/analytics)
├── login/page.tsx                # Admin login (outside auth gate)
├── bookings/
│   ├── page.tsx                  # Booking list with filters
│   └── [id]/page.tsx             # Single booking detail + actions
├── reviews/
│   └── page.tsx                  # Manual review queue (pending_review bookings)
├── vendors/
│   ├── page.tsx                  # Commissioner/notary list
│   ├── new/page.tsx              # Add new commissioner
│   └── [id]/page.tsx             # Edit commissioner profile
├── services/
│   ├── page.tsx                  # Service list + toggle active
│   └── [id]/page.tsx             # Edit service details
├── locations/
│   ├── page.tsx                  # Location list
│   └── [id]/page.tsx             # Edit location
├── analytics/
│   └── page.tsx                  # Analytics dashboard
└── settings/
    └── page.tsx                  # Site settings (GA IDs, pricing, etc.)
```

---

## Phase 1: Foundation (Auth + Layout + Dashboard)

### 1A. Authentication via Supabase Auth

- Use **Supabase Auth with email/password** (no social logins needed for admin).
- Create a new `co_admin_users` table or use Supabase Auth's built-in `auth.users` with a role check.
- Recommended approach: Use Supabase Auth + an `admin_role` column in a `co_profiles` table linked to `auth.users.id`.
- Middleware at `/app/admin/layout.tsx` checks session; redirects to `/admin/login` if unauthenticated.

**New database objects:**
```sql
-- Profiles table linked to Supabase Auth
CREATE TABLE co_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',  -- 'owner', 'admin', 'viewer'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies: only authenticated admins can access co_ tables via admin API
ALTER TABLE co_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read profiles" ON co_profiles
  FOR SELECT USING (auth.uid() = id);
```

**Files to create:**
- `/lib/supabase-admin.ts` — Server-side Supabase client using service role key (for admin operations)
- `/lib/supabase-browser.ts` — Browser-side client for auth session management
- `/app/admin/login/page.tsx` — Login form (email + password)
- `/app/admin/layout.tsx` — Auth-gated layout with sidebar
- `/middleware.ts` — Next.js middleware to protect `/admin/*` routes

### 1B. Admin Layout & Navigation

**Sidebar navigation items:**
1. Dashboard (overview)
2. Bookings (with badge count for pending)
3. Manual Reviews (with badge count)
4. Vendors (commissioners/notaries)
5. Services
6. Locations
7. Analytics
8. Settings

**Top bar:** Current admin name, logout button.

**Responsive:** Collapsible sidebar on mobile, hamburger menu.

### 1C. Dashboard Page (`/admin`)

**KPI cards (top row):**
- Today's bookings count
- Pending reviews count (badge, highlighted)
- Revenue this month (sum of `amount_paid` from `co_bookings`)
- Total bookings this month

**Recent activity feed:**
- Last 10 bookings with status, service name, customer name, timestamp
- Quick-action buttons: View, Approve (if pending_review)

**Charts (stretch goal):**
- Bookings per day (last 30 days) — bar chart
- Revenue per week (last 12 weeks) — line chart
- Bookings by service — pie/donut chart

---

## Phase 2: Booking Management

### 2A. Bookings List (`/admin/bookings`)

**Table columns:**
| Column | Source |
|---|---|
| Booking ID | `co_bookings.id` (truncated UUID) |
| Customer | `name`, `email`, `phone` |
| Service | `service_name` |
| Commissioner | `commissioner_id` → join to `co_commissioners.name` |
| Appointment | `appointment_datetime` (formatted Calgary time) |
| Status | Badge: `pending_review` / `pending_scheduling` / `pending_payment` / `paid` / `confirmed` / `cancelled` / `no_show` |
| Amount | `amount_paid` (formatted as CAD) |
| Created | `created_at` |

**Filters & search:**
- Status dropdown (multi-select)
- Date range picker (created_at or appointment_datetime)
- Commissioner filter
- Service filter
- Free-text search (name, email, phone)

**Bulk actions:**
- Export to CSV
- Bulk status update (e.g., mark multiple as confirmed)

### 2B. Booking Detail (`/admin/bookings/[id]`)

**Display:** All booking fields, linked commissioner/service info, Stripe payment details.

**Actions:**
- **Change status** — dropdown to transition between statuses
- **Reschedule** — update `appointment_datetime`
- **Cancel** — set status to `cancelled`, optionally trigger refund via Stripe API
- **Send reminder email** — trigger email to customer via Brevo
- **Add internal notes** — new `admin_notes` field on `co_bookings`
- **View Stripe payment** — link to Stripe dashboard

**New columns needed on `co_bookings`:**
```sql
ALTER TABLE co_bookings ADD COLUMN admin_notes TEXT;
ALTER TABLE co_bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE co_bookings ADD COLUMN cancelled_reason TEXT;
```

**New statuses to add:** `cancelled`, `no_show`, `completed`

---

## Phase 3: Manual Review Queue

### 3A. Review Queue (`/admin/reviews`)

Filtered view of `co_bookings WHERE status = 'pending_review'`, sorted by `created_at ASC` (oldest first).

**Each review card shows:**
- Customer name, email, phone
- Service requested + `review_reason` from `co_services`
- Notes from customer
- Number of documents
- Time since submission

**Actions per review:**
- **Approve** → status changes to `pending_scheduling`, email sent to customer with booking link/instructions
- **Reject** → status changes to `rejected`, email sent with reason
- **Request more info** → email sent to customer, status stays `pending_review`, note added

**New status:** `rejected`

**New table for review audit trail:**
```sql
CREATE TABLE co_review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES co_bookings(id),
  action TEXT NOT NULL,          -- 'approved', 'rejected', 'info_requested'
  admin_user_id UUID REFERENCES co_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 4: Vendor Management (Commissioners & Notaries)

### 4A. Vendor List (`/admin/vendors`)

**Table columns:** Name, title, location, languages, credentials, active status, sort order.

**Actions:** Edit, toggle active, reorder (drag-and-drop or sort_order input).

### 4B. Add/Edit Vendor (`/admin/vendors/new` & `/admin/vendors/[id]`)

**Form fields (maps to `co_commissioners`):**
- Name, title, bio
- Location name, location slug, address
- Phone, email
- Calendly URL
- Languages (multi-select/tag input)
- Credentials (multi-select: Commissioner of Oaths, Notary Public, etc.)
- Hours: weekdays, saturday, sunday
- Google Maps embed URL, map URL
- Areas served (tag input)
- Nearby neighbourhoods (tag input)
- Active toggle
- Sort order
- **Services offered** — checkboxes from `co_services`, writes to `co_commissioner_services`

**Booking fee config:**
- Currently hardcoded in `/lib/data/booking.ts` as `BOOKING_FEES`
- Migrate to database: add `booking_fee_cents` column to `co_commissioners`

```sql
ALTER TABLE co_commissioners ADD COLUMN booking_fee_cents INTEGER DEFAULT 4000;
```

### 4C. Partner Applications

- The `/join` page sends applications via email to `info@calgaryoaths.com`
- Add a new table to capture these in the database:

```sql
CREATE TABLE co_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  credentials TEXT,
  location TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',   -- 'new', 'contacted', 'approved', 'declined'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Admin view at `/admin/vendors` with a tab for "Applications"

---

## Phase 5: Service & Location Management

### 5A. Services (`/admin/services`)

**Editable fields from `co_services`:**
- Name, slug, short description
- Price (cents), price label
- `requires_review` toggle + review reason
- Slot duration (minutes)
- Display order
- Active toggle

### 5B. Locations (`/admin/locations`)

**Editable fields from `co_locations`:**
- Name, address, phone
- Commissioner assignment (dropdown from `co_commissioners`)
- Parking notes
- Nearby neighbourhoods
- Google Maps embed, map URL
- Calendly URL
- Hours (weekdays, saturday, sunday)
- Geo coordinates (lat/lng)
- Active toggle, sort order

---

## Phase 6: Analytics & Reporting

### 6A. Analytics Dashboard (`/admin/analytics`)

**Metrics (queried from `co_bookings`):**
- **Bookings over time** — daily/weekly/monthly bar chart
- **Revenue over time** — line chart (sum of `amount_paid`)
- **Bookings by service** — pie chart
- **Bookings by commissioner** — pie chart
- **Conversion funnel** — bookings created vs. paid vs. confirmed
- **Average booking value** — `AVG(amount_paid)`
- **Cancellation/no-show rate**

**Filters:**
- Date range
- Commissioner
- Service

**GA4/GTM Integration:**
- Display current GA4 and GTM IDs (from `co_settings`)
- Edit them from Settings page
- Link to Google Analytics dashboard (external)

### 6B. Export

- CSV export for bookings data (filtered)
- Date range selection for reports

---

## Phase 7: Settings

### 7A. Site Settings (`/admin/settings`)

**Manage `co_settings` key-value pairs:**
- GA4 Measurement ID (`ga4_id`)
- GTM Container ID (`gtm_id`)
- Starting price display (`starting_price`)
- Contact email
- WhatsApp number

**Future settings:**
- Slot duration default
- Days ahead for booking window
- Business hours defaults
- Email notification preferences

---

## New API Routes

```
/app/api/admin/
├── auth/
│   └── route.ts              # Login/logout/session check
├── bookings/
│   ├── route.ts              # GET (list + filters), PATCH (bulk update)
│   └── [id]/
│       ├── route.ts          # GET (detail), PATCH (update status/notes)
│       └── cancel/route.ts   # POST (cancel + optional Stripe refund)
├── reviews/
│   └── [id]/
│       └── action/route.ts   # POST (approve/reject/request-info)
├── vendors/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/route.ts         # GET, PATCH, DELETE
├── services/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # GET, PATCH
├── locations/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # GET, PATCH
├── analytics/
│   └── route.ts              # GET (aggregated stats with date range)
├── settings/
│   └── route.ts              # GET, PATCH
└── export/
    └── route.ts              # GET (CSV export)
```

---

## Database Schema Changes Summary

### New Tables
| Table | Purpose |
|---|---|
| `co_profiles` | Admin user profiles linked to Supabase Auth |
| `co_review_actions` | Audit trail for manual review decisions |
| `co_partner_applications` | Vendor/partner applications from `/join` page |

### Altered Tables
| Table | Change |
|---|---|
| `co_bookings` | Add: `admin_notes`, `cancelled_at`, `cancelled_reason` columns |
| `co_bookings` | New statuses: `cancelled`, `no_show`, `completed`, `rejected` |
| `co_commissioners` | Add: `booking_fee_cents` column (migrate from hardcoded `BOOKING_FEES`) |

---

## Implementation Priority & Phasing

| Phase | Scope | Effort |
|---|---|---|
| **Phase 1** | Auth + Layout + Dashboard | Foundation — must be first |
| **Phase 2** | Booking Management | Highest operational value |
| **Phase 3** | Manual Review Queue | Eliminates email-based workflow |
| **Phase 4** | Vendor Management | Enables scaling to more commissioners |
| **Phase 5** | Service & Location Management | Removes hardcoded data dependency |
| **Phase 6** | Analytics & Reporting | Business intelligence |
| **Phase 7** | Settings | Quality of life |

---

## Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth provider | Supabase Auth (email/password) | Already using Supabase; no extra dependency |
| UI components | Tailwind + custom components | Consistent with existing site; no new UI library needed |
| Charts | `recharts` or `chart.js` | Lightweight, React-native charting |
| Data tables | Custom with Tailwind or `@tanstack/react-table` | Flexible filtering/sorting/pagination |
| State management | React Server Components + client forms | Matches Next.js 14 App Router patterns |
| CSV export | Server-side generation, streamed response | No client-side dependency needed |
| Admin route protection | Next.js middleware + Supabase session | Standard pattern for App Router |

---

## Security Considerations

- All `/api/admin/*` routes validate Supabase auth session + admin role
- Supabase RLS policies on all `co_` tables restrict writes to authenticated admin users
- Service role key used only server-side, never exposed to client
- CSRF protection via Next.js built-in mechanisms
- Rate limiting on login endpoint
- Audit logging for sensitive actions (status changes, cancellations, refunds)
