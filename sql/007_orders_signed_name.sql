-- Migration: printed name at signing
-- Stores the printed name the customer types in the signature block
-- alongside their handwritten signature image.

ALTER TABLE co_orders ADD COLUMN IF NOT EXISTS signed_name text;
