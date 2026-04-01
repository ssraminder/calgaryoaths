# Payout System Implementation Plan

## Status

- **Phase 1: DONE** — Appointment completion workflow (DB tables, upload APIs, vendor UI)
- **Phase 2: DEFERRED** — Admin payout dashboard (build when external vendors onboard)
- **Phase 3: DEFERRED** — Vendor payout history page (build when external vendors onboard)

> Phases 2 & 3 are not needed while all commissioners are internal (Raminder & Amrita).
> Build these when external/partner vendors join the platform and need automated payout tracking.

## Overview

Appointment lifecycle: vendor confirms appointment → completes service → uploads customer ID + commissioned documents → marks as complete → payout becomes eligible → admin processes weekly manual payout (e-Transfer or bank transfer).

---

## Phase 1: Appointment Completion Workflow

### 1.1 New DB table: `co_appointment_documents`

Stores uploaded customer IDs and commissioned document photos.

```sql
CREATE TABLE co_appointment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES co_bookings(id) ON DELETE CASCADE,
  commissioner_id text NOT NULL REFERENCES co_commissioners(id),
  type text NOT NULL CHECK (type IN ('customer_id', 'commissioned_document')),
  file_url text NOT NULL,
  file_name text,
  uploaded_at timestamptz DEFAULT now()
);
```

### 1.2 New columns on `co_bookings`

```sql
ALTER TABLE co_bookings ADD COLUMN completed_at timestamptz;
ALTER TABLE co_bookings ADD COLUMN completion_notes text;
ALTER TABLE co_bookings ADD COLUMN payout_status text DEFAULT 'pending'
  CHECK (payout_status IN ('pending', 'eligible', 'paid'));
ALTER TABLE co_bookings ADD COLUMN payout_reference text;   -- e-Transfer ref or note
ALTER TABLE co_bookings ADD COLUMN payout_paid_at timestamptz;
ALTER TABLE co_bookings ADD COLUMN payout_batch_id uuid;    -- links to co_payout_batches
```

### 1.3 New DB table: `co_payout_batches`

Groups weekly payouts per vendor.

```sql
CREATE TABLE co_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioner_id text NOT NULL REFERENCES co_commissioners(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_cents integer NOT NULL,
  booking_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method text,            -- 'e_transfer', 'bank_transfer', etc.
  payment_reference text,         -- e-Transfer confirmation #
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### 1.4 Supabase Storage bucket: `appointment-documents`

Private bucket — only authenticated users can upload/read. Files organized as:
```
appointment-documents/{booking_id}/{type}_{timestamp}.{ext}
```

### 1.5 Vendor portal: Complete Appointment flow

On the vendor booking detail page (`/vendor/bookings/[id]`), after status = `confirmed`:

1. **Upload section** appears:
   - "Upload Customer ID" — file input (photo/scan, max 10MB, jpg/png/pdf)
   - "Upload Commissioned Document(s)" — file input (multiple)
   - Uploaded files show as thumbnails with delete option

2. **Mark as Complete** button — only enabled when:
   - At least 1 customer ID uploaded
   - At least 1 commissioned document uploaded
   - Optional: completion notes field

3. On submit:
   - Status → `completed`
   - `completed_at` = now
   - `payout_status` = `eligible`

### 1.6 API endpoints

- `POST /api/vendor/bookings/[id]/upload` — upload doc to Supabase Storage, create row
- `DELETE /api/vendor/bookings/[id]/upload?docId=xxx` — delete uploaded document
- `POST /api/vendor/bookings/[id]/complete` — mark complete (validates uploads exist)
- `GET /api/vendor/bookings/[id]/documents` — list uploaded documents

---

## Phase 2: Admin Payout Dashboard

### 2.1 New page: `/admin/payouts`

**Summary cards:**
- Total eligible (unpaid completed appointments)
- Total paid this week / this month

**Weekly batch workflow:**
1. Admin opens payouts page, sees eligible bookings grouped by vendor
2. Clicks "Generate Weekly Batch" → creates `co_payout_batches` row per vendor
   - Aggregates all `payout_status = 'eligible'` bookings for that vendor
   - Period = last Monday–Sunday (or custom range)
   - Links bookings to batch via `payout_batch_id`
3. Admin sends e-Transfer/bank transfer manually
4. Clicks "Mark Batch as Paid" → enters payment reference
   - Updates batch: `status = 'paid'`, `paid_at = now`, `payment_reference`
   - Updates all linked bookings: `payout_status = 'paid'`, `payout_paid_at = now`

**Table columns:** Vendor, Period, Bookings, Total Payout, Status, Action

**Per-vendor breakdown:** Click to expand — shows individual bookings in the batch

### 2.2 API endpoints

- `GET /api/admin/payouts` — list batches + eligible summary
- `POST /api/admin/payouts` — generate batch for a vendor (or all vendors)
- `PATCH /api/admin/payouts/[batchId]` — mark batch as paid

---

## Phase 3: Vendor Payout History

### 3.1 New page: `/vendor/payouts`

- Earnings summary: This week / This month / All time
- Payout history table: Period, Bookings, Amount, Status, Reference
- Click batch to see individual bookings

### 3.2 API endpoints

- `GET /api/vendor/payouts` — vendor's batch history + earnings summary

---

## Implementation Order

1. **DB setup** — Create tables + columns + storage bucket
2. **Upload APIs** — File upload/delete/list endpoints
3. **Vendor completion UI** — Upload section + complete button on booking detail
4. **Admin payout dashboard** — Batch generation, mark-as-paid flow
5. **Vendor payout history** — Earnings page
6. **Nav links** — Add Payouts to admin sidebar and vendor nav

### Files to create

```
app/api/vendor/bookings/[id]/upload/route.ts
app/api/vendor/bookings/[id]/complete/route.ts
app/api/vendor/bookings/[id]/documents/route.ts
app/api/admin/payouts/route.ts
app/api/admin/payouts/[batchId]/route.ts
app/api/vendor/payouts/route.ts
app/admin/payouts/page.tsx
app/vendor/payouts/page.tsx
components/vendor/DocumentUpload.tsx
```

### Files to modify

```
app/vendor/bookings/[id]/page.tsx   — upload section + complete button
app/vendor/layout.tsx               — add Payouts nav link
components/admin/Sidebar.tsx        — add Payouts nav link
```

### Constraints
- Customer ID photos: private bucket, RLS, vendor can only access own bookings
- Documents auto-deleted after 90 days (Supabase lifecycle policy)
- Max file size: 10MB per upload
- Accepted formats: jpg, png, pdf, heic
- Vendor can only complete bookings assigned to them
- Payout only eligible after BOTH customer ID + document uploaded
- Weekly pay cycle: Mon–Sun completed appointments, paid following week
- Platform fee is NOT included in vendor payout — only `vendor_payout_cents`
