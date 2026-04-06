-- Migration: Add Apple (CalDAV) support to calendar connections
-- Updates provider check constraint to include 'apple'
-- Adds CalDAV-specific fields for Apple Calendar authentication

-- Drop and re-add provider constraint to include 'apple'
ALTER TABLE co_calendar_connections DROP CONSTRAINT IF EXISTS co_calendar_connections_provider_check;
ALTER TABLE co_calendar_connections ADD CONSTRAINT co_calendar_connections_provider_check
  CHECK (provider IN ('google', 'microsoft', 'apple'));

-- CalDAV server URL (used by Apple Calendar — defaults to iCloud endpoint)
ALTER TABLE co_calendar_connections ADD COLUMN IF NOT EXISTS caldav_url text;

-- Display name for the connection (e.g. "Work Calendar", "Personal")
ALTER TABLE co_calendar_connections ADD COLUMN IF NOT EXISTS display_name text;

-- For Google/Microsoft: store the primary calendar ID selected by the user
-- For Apple: this is the CalDAV calendar path
COMMENT ON COLUMN co_calendar_connections.calendar_id IS 'Google Calendar ID, Microsoft calendar ID, or Apple CalDAV calendar path';
