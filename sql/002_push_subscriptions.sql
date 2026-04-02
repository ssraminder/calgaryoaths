-- Migration: Push notification subscriptions for vendor PWA
-- Stores Web Push API subscriptions linked to user profiles (vendors).

CREATE TABLE IF NOT EXISTS co_push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,       -- client public key
  auth text NOT NULL,         -- auth secret
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON co_push_subscriptions(user_id);
