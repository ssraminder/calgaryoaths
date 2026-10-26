-- Migration: calendar connection health + booking ↔ calendar event mapping.
--
-- 1. co_calendar_connections gets a health status so a dead token is visible
--    (vendor banner, dashboard card, alert) instead of failing silently.
--      active          – tokens work
--      needs_reconnect – the user's grant is gone (invalid_grant, revoked consent);
--                        the commissioner must reconnect
--      config_error    – the platform's OAuth app is broken (e.g. expired Azure
--                        client secret, AADSTS7000222); an admin must fix env vars,
--                        reconnecting will not help
-- 2. co_bookings.calendar_events stores the external event ID per connection so
--    reschedules update and cancellations delete the right event:
--      { "<connection_id>": { "provider": "microsoft", "event_id": "...",
--                             "start": "<iso>", "adopted": false } }
--    "adopted" marks an event someone created by hand that the backfill matched;
--    those are never edited or deleted by the app.
--
-- Additive only, safe to re-run.

ALTER TABLE co_calendar_connections
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE co_calendar_connections DROP CONSTRAINT IF EXISTS co_calendar_connections_status_check;
ALTER TABLE co_calendar_connections ADD CONSTRAINT co_calendar_connections_status_check
  CHECK (status IN ('active', 'needs_reconnect', 'config_error'));

ALTER TABLE co_calendar_connections ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE co_calendar_connections ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
ALTER TABLE co_calendar_connections ADD COLUMN IF NOT EXISTS last_alerted_at timestamptz;

ALTER TABLE co_bookings
  ADD COLUMN IF NOT EXISTS calendar_events jsonb NOT NULL DEFAULT '{}'::jsonb;
