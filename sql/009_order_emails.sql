-- Migration: order emails log
-- Records every transactional email we send for an order so staff can
-- track delivery / open / click status via the Brevo events API.

create table if not exists co_order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references co_orders(id) on delete cascade,
  message_id text,            -- Brevo messageId returned by /v3/smtp/email
  recipient text not null,
  subject text not null,
  kind text not null,         -- 'signed_terms_on_submit' | 'invoice_terms' | 'cancellation_customer' | 'cancellation_partner' | 'other'
  attachments_json jsonb,     -- list of attachment filenames
  triggered_by uuid references co_profiles(id) on delete set null,
  triggered_by_name text,
  sent_at timestamptz not null default now()
);

create index if not exists co_order_emails_order_id_sent_at_idx
  on co_order_emails (order_id, sent_at desc);
create index if not exists co_order_emails_message_id_idx
  on co_order_emails (message_id);
