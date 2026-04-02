-- Feature 1: Custom time slots by date
-- Allows admins to add extra time slots on specific dates beyond regular availability rules
CREATE TABLE IF NOT EXISTS co_custom_times (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commissioner_id text NOT NULL REFERENCES co_commissioners(id) ON DELETE CASCADE,
  location_id uuid REFERENCES co_locations(id) ON DELETE SET NULL,
  custom_date date NOT NULL,
  start_time text NOT NULL,  -- HH:MM format
  end_time text NOT NULL,    -- HH:MM format
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (commissioner_id, custom_date, start_time, end_time)
);

CREATE INDEX idx_custom_times_commissioner ON co_custom_times(commissioner_id, custom_date);

-- Feature 2: Customer cancellation token on bookings
-- The cancel_token column allows customers to cancel from email
ALTER TABLE co_bookings ADD COLUMN IF NOT EXISTS cancel_token text;
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON co_bookings(cancel_token) WHERE cancel_token IS NOT NULL;

-- Feature 3: Service booking notice (important info shown before payment)
-- The column already exists as important_notes (text[]) and what_to_bring (text[])
-- Add a new booking_notice column for a prominent notice shown before payment
ALTER TABLE co_services ADD COLUMN IF NOT EXISTS booking_notice text;

-- Seed affidavit writing booking notice
UPDATE co_services
SET booking_notice = 'This is the basic price we charge for our drafting service. Should your needs require additional effort and additional time, you will be informed of the same before your appointment begins.'
WHERE slug = 'affidavit-writing' OR slug = 'affidavit-drafting' OR name ILIKE '%affidavit%writ%' OR name ILIKE '%affidavit%draft%';
