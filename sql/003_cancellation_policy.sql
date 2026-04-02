-- Add vendor-configurable cancellation policy windows to co_commissioners
-- free_cancel_hours: hours before appointment where customer gets automatic refund (default 12)
-- request_cancel_hours: hours before appointment where cancellation requires vendor approval (default 6)
-- Below request_cancel_hours: no cancellation allowed, treated as no-show

ALTER TABLE co_commissioners
  ADD COLUMN IF NOT EXISTS free_cancel_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS request_cancel_hours integer NOT NULL DEFAULT 6;

-- Add pending_cancellation status support to bookings
-- When a customer cancels between free_cancel_hours and request_cancel_hours,
-- the booking goes to pending_cancellation until the vendor approves/denies
ALTER TABLE co_bookings
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_decided_by text,
  ADD COLUMN IF NOT EXISTS cancellation_decided_at timestamptz;
