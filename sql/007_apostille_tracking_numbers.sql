-- Migration: apostille tracking numbers
-- Staff record outbound courier tracking (to the government office) and
-- inbound tracking (from the government office back to us) while the order
-- is in flight.

ALTER TABLE co_orders ADD COLUMN IF NOT EXISTS tracking_to_gov text;
ALTER TABLE co_orders ADD COLUMN IF NOT EXISTS tracking_from_gov text;
