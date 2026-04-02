-- Custom date/time overrides: add extra availability OR block specific time windows
-- This replaces the previous co_custom_times definition.
-- mode = 'add'   → extra time slot on that date (beyond regular rules)
-- mode = 'block' → block a time window on that date (override regular rules)
-- source: 'manual' for admin/vendor entries, 'calendar' for future calendar sync
DROP TABLE IF EXISTS co_custom_times;
CREATE TABLE co_custom_times (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commissioner_id text NOT NULL REFERENCES co_commissioners(id) ON DELETE CASCADE,
  location_id uuid REFERENCES co_locations(id) ON DELETE SET NULL,
  custom_date date NOT NULL,
  start_time text NOT NULL,  -- HH:MM format (Calgary local time)
  end_time text NOT NULL,    -- HH:MM format (Calgary local time)
  mode text NOT NULL DEFAULT 'add' CHECK (mode IN ('add', 'block')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'calendar')),
  reason text DEFAULT '',
  external_event_id text,    -- for calendar sync: Google/M365 event ID
  created_at timestamptz DEFAULT now(),
  UNIQUE (commissioner_id, custom_date, start_time, end_time, mode)
);

CREATE INDEX idx_custom_times_commissioner ON co_custom_times(commissioner_id, custom_date);
CREATE INDEX idx_custom_times_external ON co_custom_times(external_event_id) WHERE external_event_id IS NOT NULL;

-- Calendar integration table (future-ready)
-- Stores vendor calendar connections for Google Calendar and Microsoft 365
CREATE TABLE IF NOT EXISTS co_calendar_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commissioner_id text NOT NULL REFERENCES co_commissioners(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  calendar_id text NOT NULL,        -- Google calendar ID or M365 calendar ID
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  sync_enabled boolean DEFAULT true,
  push_bookings boolean DEFAULT true,   -- push confirmed bookings to calendar
  pull_busy_times boolean DEFAULT true,  -- pull busy times to block slots
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (commissioner_id, provider, calendar_id)
);

-- Customer cancellation token on bookings
ALTER TABLE co_bookings ADD COLUMN IF NOT EXISTS cancel_token text;
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON co_bookings(cancel_token) WHERE cancel_token IS NOT NULL;

-- Service booking notice (important info shown before payment)
ALTER TABLE co_services ADD COLUMN IF NOT EXISTS booking_notice text;

-- Seed affidavit writing booking notice
UPDATE co_services
SET booking_notice = 'This is the basic price we charge for our drafting service. Should your needs require additional effort and additional time, you will be informed of the same before your appointment begins.'
WHERE slug = 'affidavit-writing' OR slug = 'affidavit-drafting' OR name ILIKE '%affidavit%writ%' OR name ILIKE '%affidavit%draft%';
