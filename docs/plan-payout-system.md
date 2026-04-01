# Payout System Implementation Plan

## Overview

Complete appointment lifecycle: vendor completes appointment → uploads proof documents → marks as complete → payout becomes eligible → Stripe Connect auto-transfers funds.

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
  file_url text NOT NULL,        -- Supabase Storage URL
  file_name text,
  uploaded_at timestamptz DEFAULT now()
);
```

### 1.2 New columns on `co_bookings`

```sql
ALTER TABLE co_bookings ADD COLUMN completed_at timestamptz;
ALTER TABLE co_bookings ADD COLUMN completion_notes text;
ALTER TABLE co_bookings ADD COLUMN payout_eligible boolean DEFAULT false;
ALTER TABLE co_bookings ADD COLUMN payout_status text DEFAULT 'pending'
  CHECK (payout_status IN ('pending', 'eligible', 'processing', 'paid', 'failed'));
ALTER TABLE co_bookings ADD COLUMN payout_transfer_id text;  -- Stripe Transfer ID
ALTER TABLE co_bookings ADD COLUMN payout_paid_at timestamptz;
```

### 1.3 Supabase Storage bucket: `appointment-documents`

Private bucket — only authenticated users can upload/read. Files organized as:
```
appointment-documents/{booking_id}/{type}_{timestamp}.{ext}
```

### 1.4 Vendor portal: Complete Appointment flow

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
   - `payout_eligible` = true
   - `payout_status` = `eligible`

### 1.5 API endpoints needed

- `POST /api/vendor/bookings/[id]/upload` — upload document to Supabase Storage, create `co_appointment_documents` row
- `DELETE /api/vendor/bookings/[id]/upload?docId=xxx` — delete uploaded document
- `POST /api/vendor/bookings/[id]/complete` — mark appointment as complete (validates uploads exist)
- `GET /api/vendor/bookings/[id]/documents` — list uploaded documents for a booking

---

## Phase 2: Stripe Connect Integration

### 2.1 New column on `co_commissioners`

```sql
ALTER TABLE co_commissioners ADD COLUMN stripe_account_id text;
```

### 2.2 Vendor Stripe Connect onboarding

- Add "Connect Stripe Account" to admin vendor edit page
- Use Stripe Connect Express accounts (simplest for vendors)
- Onboarding flow:
  1. Admin clicks "Create Stripe Account" for vendor
  2. System creates Express account via Stripe API
  3. Generates onboarding link → vendor completes identity verification
  4. Webhook captures `account.updated` → stores `stripe_account_id`

### 2.3 Automatic payout on appointment completion

When a booking is marked `completed` and `payout_eligible = true`:

1. Check vendor has `stripe_account_id`
2. Create a Stripe Transfer:
   ```
   stripe.transfers.create({
     amount: vendor_payout_cents,
     currency: 'cad',
     destination: stripe_account_id,
     transfer_group: booking_id,
     description: `Payout for ${service_name} - ${customer_name}`
   })
   ```
3. Update booking: `payout_status = 'paid'`, `payout_transfer_id = transfer.id`, `payout_paid_at = now`

### 2.4 Fallback for vendors without Stripe Connect

If vendor has no `stripe_account_id`:
- `payout_status` stays `eligible`
- Shows in admin payout dashboard for manual processing
- Admin can mark as paid manually (records e-Transfer reference)

---

## Phase 3: Admin Payout Dashboard

### 3.1 New page: `/admin/payouts`

- **Summary cards**: Total eligible, Total processing, Total paid (this month)
- **Filterable table**: All bookings with `payout_status` = eligible/processing/paid
- **Columns**: Date, Vendor, Service, Customer, Payout Amount, Status, Action
- **Bulk actions**: "Pay All Eligible" (triggers Stripe Transfers), "Export CSV"
- **Per-row actions**: "Mark Paid Manually" (for e-Transfer), "View Details"

### 3.2 Vendor payout history

On vendor portal, new `/vendor/payouts` page:
- List of completed appointments with payout status
- Total earned this month / all time
- Stripe Connect status indicator

---

## Implementation Order

1. **Phase 1.3** — Create Supabase Storage bucket
2. **Phase 1.1 + 1.2** — Create DB table + columns
3. **Phase 1.5** — Build upload/complete API endpoints
4. **Phase 1.4** — Build vendor UI (upload + complete flow)
5. **Phase 2.1 + 2.2** — Stripe Connect onboarding
6. **Phase 2.3** — Auto-payout on completion
7. **Phase 3** — Admin dashboard + vendor payout history

### Files to create/modify

**New files:**
- `app/api/vendor/bookings/[id]/upload/route.ts`
- `app/api/vendor/bookings/[id]/complete/route.ts`
- `app/api/vendor/bookings/[id]/documents/route.ts`
- `app/api/admin/payouts/route.ts`
- `app/admin/payouts/page.tsx`
- `app/vendor/payouts/page.tsx`
- `components/vendor/DocumentUpload.tsx`

**Modified files:**
- `app/vendor/bookings/[id]/page.tsx` — add upload section + complete button
- `app/admin/vendors/[id]/page.tsx` — add Stripe Connect section
- `app/vendor/layout.tsx` — add Payouts nav link
- `app/admin/layout.tsx` or sidebar — add Payouts nav link

### Critical constraints
- Customer ID photos must be stored securely (private bucket, RLS)
- Documents auto-deleted after 90 days (retention policy)
- Vendor can only upload for their own bookings
- Payout only triggered after BOTH uploads verified
- Platform fee is NOT transferred — only `vendor_payout_cents`
