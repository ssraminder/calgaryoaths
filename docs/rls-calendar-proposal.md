# Proposal: lock down tables used by the calendar features

**Status: proposal only. Nothing here has been run.** RLS was intentionally left out of the
Outlook calendar fix; this is the follow-up.

## Why this is urgent

Checked on 2026-10-26 (read-only `has_table_privilege` / `pg_class` query):

| Table | RLS | `anon` SELECT | `anon` UPDATE | Policies | Sensitive contents |
|---|---|---|---|---|---|
| `co_calendar_connections` | off | yes | yes | 0 | **OAuth access + refresh tokens; Apple app-specific passwords** |
| `co_bookings` | off | yes | yes | 0 | customer names, emails, phones, addresses, payment IDs, `calendar_events` |
| `co_custom_times` | off | yes | yes | 0 | vendor busy times (includes synced calendar event IDs) |
| `co_availability_rules` | off | yes | yes | 0 | vendor schedules |
| `co_commissioners` | off | yes | yes | 0 | vendor emails, phones, addresses |
| `co_locations` | off | yes | yes | 0 | public addresses |
| `co_settings` | off | yes | yes | 0 | analytics IDs, config |
| `co_push_subscriptions` | off | yes | yes | 0 | push endpoints + keys |
| `co_blocked_dates` | on | — | — | 2 | |
| `co_profiles` | on | — | — | 1 | |

The anon key is public (it ships to every browser). With RLS off and default grants, anyone can
call `GET /rest/v1/co_calendar_connections?select=refresh_token` and receive the commissioner's
Microsoft refresh token, which grants `Calendars.ReadWrite` on their mailbox. Today that token is
inert only because the Azure client secret expired; **it becomes usable again as soon as the
secret is rotated.** Anyone can also rewrite rows (e.g. point a connection at their own tokens).

## Who reads these tables

Every query on the tables above goes through `supabaseAdmin` (service role) in server code.
Service role bypasses RLS, so enabling RLS with **no policies** cuts off anon/authenticated
access without changing app behaviour. The only table read with the user's own key is
`co_profiles` (vendor/admin/tablet layouts and login), which already has RLS.

## Proposed SQL

Step 1 (calendar tables; safe now, no app changes needed):

```sql
-- Tokens must never be reachable with the public key
ALTER TABLE co_calendar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON co_calendar_connections FROM anon, authenticated;

-- Calendar-synced and manual busy blocks: server-only
ALTER TABLE co_custom_times ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON co_custom_times FROM anon, authenticated;
```

Step 2 (booking data; also server-only today, but touches more of the app, so deploy and
watch for errors):

```sql
ALTER TABLE co_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON co_bookings FROM anon, authenticated;

ALTER TABLE co_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON co_push_subscriptions FROM anon, authenticated;

-- Readable vendor/schedule data: allow reads only if you ever need them client-side;
-- today nothing does, so no policy = no access.
ALTER TABLE co_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_commissioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_settings ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON co_availability_rules, co_commissioners, co_locations, co_settings
  FROM anon, authenticated;
```

If a future client component needs direct reads, add a narrow policy, e.g.:

```sql
-- Vendors read only their own connection metadata (never the token columns: use a view)
CREATE POLICY vendor_reads_own_connections ON co_calendar_connections
  FOR SELECT TO authenticated
  USING (commissioner_id IN (SELECT id FROM co_commissioners WHERE user_id = auth.uid()));
```

## Order of operations

1. Apply step 1 **before** rotating the Azure client secret.
2. Treat the stored refresh token as exposed. Reconnecting alone does **not** invalidate an
   earlier Microsoft refresh token. To kill it, revoke the app's permissions for that account
   (My Apps → the calgaryoaths app → Revoke permissions, or an Entra admin revoking the
   user's sessions), then reconnect Outlook from `/vendor/calendar`.
3. Run the Supabase security advisor (`get_advisors`) afterwards to catch the remaining 60-odd
   tables.
