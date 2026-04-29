-- Migration: tax province on orders
-- Adds tax_province_code column that selects a row from co_tax_rates
-- so each order's GST/PST/HST is correct for the customer's province.
-- Defaults to 'AB' (Alberta — 5% GST only) since Calgary Oaths is based in Alberta.

ALTER TABLE co_orders ADD COLUMN IF NOT EXISTS tax_province_code text DEFAULT 'AB';
CREATE INDEX IF NOT EXISTS idx_orders_tax_province ON co_orders(tax_province_code);
