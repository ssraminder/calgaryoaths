# Claude Desktop Prompt: Custom Google & Microsoft Calendar Integration

> Paste this entire prompt into a new Claude Desktop / Claude Code session.

---

## Context

Calgary Oaths is a Next.js 14 booking site for commissioner of oaths services in Calgary, deployed on Netlify. We have an admin panel and a vendor (commissioner) management system. We need to replace our Cronofy dependency with direct Google Calendar and Microsoft Outlook integrations to avoid per-user costs.

### Current State

The codebase already has:
- `lib/cronofy.ts` — Cronofy integration (to be replaced)
- `co_commissioners` table with fields: `cronofy_access_token`, `cronofy_refresh_token`, `cronofy_sub`, `cronofy_calendar_id`
- `co_availability_rules` table — multiple time slots per day per commissioner (keep this)
- `/api/booking/slots/route.ts` — generates available slots from availability rules + filters busy times via `getCronofyFreeBusy()`
- `/api/admin/cronofy/connect/route.ts` and `/api/admin/cronofy/callback/route.ts` — OAuth flow
- Vendor edit page at `/app/admin/vendors/[id]/page.tsx` — has "Connect Calendar" button
- `BookingForm.tsx` — customer-facing booking form

### Tech Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL) — `co_commissioners`, `co_bookings`, `co_availability_rules`
- Stripe for payments
- Deployed on Netlify
- Styling: Tailwind CSS

---

## Task

Replace the Cronofy integration with **direct Google Calendar API** and **Microsoft Graph (Outlook Calendar) API** integrations. A commissioner should be able to connect either Google or Microsoft calendar (or both). The system should:

1. Check the vendor's connected calendar for busy times when generating available booking slots
2. Create events on the vendor's calendar when a booking is confirmed
3. Handle token refresh automatically
4. Support multiple calendar providers per vendor

---

## Part A: Google Cloud Console Setup

Create a Google Cloud project and configure OAuth 2.0:

1. Go to https://console.cloud.google.com/
2. Create a new project named "Calgary Oaths Calendar"
3. Enable the **Google Calendar API** (APIs & Services > Library > search "Google Calendar API" > Enable)
4. Configure the OAuth consent screen:
   - User Type: **External**
   - App name: "Calgary Oaths"
   - User support email: info@calgaryoaths.com
   - Authorized domains: calgaryoaths.com
   - Scopes: add `https://www.googleapis.com/auth/calendar.readonly` and `https://www.googleapis.com/auth/calendar.events`
   - Test users: add admin email addresses (while in testing mode)
5. Create OAuth 2.0 credentials:
   - Application type: **Web application**
   - Name: "Calgary Oaths Calendar Integration"
   - Authorized redirect URIs: `https://calgaryoaths.com/api/admin/calendar/google/callback` and `http://localhost:3000/api/admin/calendar/google/callback`
6. Copy the **Client ID** and **Client Secret**

### Environment Variables
```
GOOGLE_CALENDAR_CLIENT_ID=<from step 6>
GOOGLE_CALENDAR_CLIENT_SECRET=<from step 6>
GOOGLE_CALENDAR_REDIRECT_URI=https://calgaryoaths.com/api/admin/calendar/google/callback
```

---

## Part B: Microsoft Azure / Entra ID Setup

Create a Microsoft Entra ID (formerly Azure AD) app registration:

1. Go to https://portal.azure.com/ > Microsoft Entra ID > App registrations > New registration
2. Name: "Calgary Oaths Calendar"
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
4. Redirect URI: Web — `https://calgaryoaths.com/api/admin/calendar/microsoft/callback`
5. After creation, go to **Certificates & secrets** > New client secret > copy the **Value**
6. Go to **API permissions** > Add a permission > Microsoft Graph > Delegated permissions:
   - `Calendars.ReadWrite`
   - `User.Read`
   - Click "Grant admin consent" if available
7. Copy **Application (client) ID** from the Overview page

### Environment Variables
```
MICROSOFT_CALENDAR_CLIENT_ID=<Application (client) ID>
MICROSOFT_CALENDAR_CLIENT_SECRET=<client secret value>
MICROSOFT_CALENDAR_REDIRECT_URI=https://calgaryoaths.com/api/admin/calendar/microsoft/callback
```

---

## Part C: Database Migration

Run this migration via Supabase MCP (project ID: `ogxklbdjffbhtlabwonl`):

```sql
-- Replace Cronofy-specific fields with provider-agnostic calendar fields
ALTER TABLE co_commissioners DROP COLUMN IF EXISTS cronofy_access_token;
ALTER TABLE co_commissioners DROP COLUMN IF EXISTS cronofy_refresh_token;
ALTER TABLE co_commissioners DROP COLUMN IF EXISTS cronofy_sub;
ALTER TABLE co_commissioners DROP COLUMN IF EXISTS cronofy_calendar_id;

-- New calendar integration fields
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_provider TEXT CHECK (calendar_provider IN ('google', 'microsoft'));
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_access_token TEXT;
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_refresh_token TEXT;
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_token_expires_at TIMESTAMPTZ;
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_id TEXT;
ALTER TABLE co_commissioners ADD COLUMN IF NOT EXISTS calendar_email TEXT;
```

---

## Part D: Implementation — Files to Create/Modify

### 1. Create `/lib/calendar.ts` (replaces `/lib/cronofy.ts`)

This is the core calendar abstraction. It should:

```typescript
// Interface that both Google and Microsoft implement
interface CalendarProvider {
  getAuthUrl(commissionerId: string): string;
  exchangeCode(code: string, commissionerId: string): Promise<void>;
  refreshToken(commissionerId: string): Promise<string>;
  getFreeBusy(commissionerId: string, from: string, to: string): Promise<BusyPeriod[]>;
  createEvent(commissionerId: string, event: CalendarEvent): Promise<boolean>;
}

type BusyPeriod = { start: string; end: string };
type CalendarEvent = {
  id: string;
  summary: string;
  start: string;          // ISO datetime
  durationMinutes: number;
  attendeeEmail?: string;
};
```

#### Google Calendar implementation details:
- **Auth URL:** `https://accounts.google.com/o/oauth2/v2/auth` with params:
  - `scope`: `https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events`
  - `access_type`: `offline` (to get refresh token)
  - `prompt`: `consent` (force consent to always get refresh token)
  - `state`: commissioner ID
- **Token exchange:** POST to `https://oauth2.googleapis.com/token`
- **Token refresh:** POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
- **Free/busy:** POST to `https://www.googleapis.com/calendar/v3/freeBusy` with body:
  ```json
  {
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-15T00:00:00Z",
    "timeZone": "America/Edmonton",
    "items": [{ "id": "primary" }]
  }
  ```
- **Create event:** POST to `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` with body:
  ```json
  {
    "summary": "Booking — Affidavit",
    "start": { "dateTime": "2024-01-05T10:00:00", "timeZone": "America/Edmonton" },
    "end": { "dateTime": "2024-01-05T10:30:00", "timeZone": "America/Edmonton" }
  }
  ```

#### Microsoft Graph implementation details:
- **Auth URL:** `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` with params:
  - `scope`: `Calendars.ReadWrite User.Read offline_access`
  - `state`: commissioner ID
- **Token exchange:** POST to `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- **Token refresh:** Same endpoint with `grant_type=refresh_token`
- **Free/busy (schedule):** POST to `https://graph.microsoft.com/v1.0/me/calendar/getSchedule` with body:
  ```json
  {
    "schedules": ["user@example.com"],
    "startTime": { "dateTime": "2024-01-01T00:00:00", "timeZone": "America/Edmonton" },
    "endTime": { "dateTime": "2024-01-15T00:00:00", "timeZone": "America/Edmonton" }
  }
  ```
  Note: For personal accounts, use the events endpoint instead: GET `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=...&endDateTime=...`
- **Create event:** POST to `https://graph.microsoft.com/v1.0/me/events` with body:
  ```json
  {
    "subject": "Booking — Affidavit",
    "start": { "dateTime": "2024-01-05T10:00:00", "timeZone": "America/Edmonton" },
    "end": { "dateTime": "2024-01-05T10:30:00", "timeZone": "America/Edmonton" }
  }
  ```

#### Token refresh logic:
Both providers should check `calendar_token_expires_at` before making API calls. If expired (or within 5 minutes of expiry), refresh first. Save the new access token + expiry to the database.

### 2. Create `/api/admin/calendar/google/callback/route.ts`
- Receives `code` and `state` (commissioner ID) from Google OAuth redirect
- Calls `googleProvider.exchangeCode(code, commissionerId)`
- Redirects to `/admin/vendors/{commissionerId}?calendar=connected`

### 3. Create `/api/admin/calendar/microsoft/callback/route.ts`
- Same pattern as Google, but for Microsoft OAuth
- Redirects to `/admin/vendors/{commissionerId}?calendar=connected`

### 4. Create `/api/admin/calendar/connect/route.ts`
- Takes `commissionerId` and `provider` (google | microsoft) as query params
- Returns redirect to the appropriate provider's auth URL

### 5. Modify `/api/booking/slots/route.ts`
- Replace `import { getCronofyFreeBusy } from '@/lib/cronofy'` with `import { getFreeBusy } from '@/lib/calendar'`
- The `getFreeBusy` function should detect which provider the commissioner uses and call the right one

### 6. Modify `/api/booking/schedule/route.ts`
- After successful Stripe payment (or in the Stripe webhook), call `createCalendarEvent()` to add the appointment to the vendor's calendar

### 7. Modify `/app/admin/vendors/[id]/page.tsx`
- Replace the single "Connect Calendar" button with two buttons:
  - "Connect Google Calendar" (with Google icon)
  - "Connect Microsoft Outlook" (with Microsoft icon)
- Show which provider is connected and the calendar email
- Add a "Disconnect Calendar" button that clears the calendar fields

### 8. Delete `/lib/cronofy.ts` and `/api/admin/cronofy/` directory

---

## Part E: Important Implementation Notes

1. **Token storage security:** Access tokens and refresh tokens are stored in `co_commissioners`. The service role key bypasses RLS, so these are only accessible server-side. Never expose them to the client.

2. **Error handling:** If a calendar API call fails (token expired, revoked, etc.), the booking flow should still work — just skip the calendar sync and log the error. Never block a customer booking because of a calendar API failure.

3. **Rate limits:**
   - Google Calendar API: 1,000,000 queries/day free tier, more than enough
   - Microsoft Graph: 10,000 requests per 10 minutes per app

4. **Testing:** After implementation, test:
   - Google OAuth flow end-to-end (connect, see busy times blocked, booking creates event)
   - Microsoft OAuth flow end-to-end
   - Token refresh after expiry
   - Graceful fallback when calendar is disconnected
   - Multiple commissioners with different providers

5. **Netlify environment variables to add:**
   ```
   GOOGLE_CALENDAR_CLIENT_ID
   GOOGLE_CALENDAR_CLIENT_SECRET
   GOOGLE_CALENDAR_REDIRECT_URI
   MICROSOFT_CALENDAR_CLIENT_ID
   MICROSOFT_CALENDAR_CLIENT_SECRET
   MICROSOFT_CALENDAR_REDIRECT_URI
   ```

6. **The existing `co_availability_rules` system stays as-is.** Calendar integration only adds busy-time filtering on top of the availability rules. If a vendor hasn't connected a calendar, slots are generated purely from availability rules + booked appointments in the DB.

---

## Verification Checklist

- [ ] Google OAuth: admin can connect a Google Calendar for a commissioner
- [ ] Microsoft OAuth: admin can connect an Outlook calendar for a commissioner
- [ ] Slot generation: busy calendar events block those time slots
- [ ] Booking confirmation: event appears on the vendor's calendar
- [ ] Token refresh: works automatically when token expires
- [ ] Disconnected calendar: booking flow works normally without calendar sync
- [ ] TypeScript compiles with zero errors
- [ ] All changes committed and pushed to the feature branch
