-- Migration: order events / audit log
-- Tracks staff edits to orders (customer info, items, service fields, discount,
-- status transitions like cancel) so admins can review who changed what and when.

create table if not exists co_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references co_orders(id) on delete cascade,
  actor_id uuid references co_profiles(id) on delete set null,
  actor_name text,
  actor_role text,
  event_type text not null,
  summary text not null,
  changes_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists co_order_events_order_id_created_at_idx
  on co_order_events (order_id, created_at desc);
