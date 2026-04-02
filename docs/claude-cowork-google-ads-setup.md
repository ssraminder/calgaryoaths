# Claude Cowork Prompt: Google Ads Conversion Tracking Setup

Copy and paste this prompt into a Claude session with access to the Google Ads MCP server and Google Tag Manager MCP server.

---

## Prompt

```
I need you to set up Google Ads conversion tracking for my website calgaryoaths.com — a Commissioner of Oaths booking service in Calgary.

## Account Details

- Google Ads Account ID: 631-615-9162 (AW-6316159162)
- This is a shared account — it also handles cethos.com
- Calgary Oaths phone number: (587) 600-0746
- Cethos phone number: (587) 600-0786 — DO NOT modify this number's conversion actions

## Website Architecture

- Next.js app deployed on Netlify
- Custom booking system with Stripe payments (NOT Calendly)
- Booking flow: User fills form → Stripe checkout → redirected to /booking/success?appointment=confirmed
- Phone number (587) 600-0746 appears on every page with click tracking

## What the Code Already Does

The codebase already has conversion tracking code wired up. It reads config from the database at runtime:

### Database settings (Supabase `co_settings` table):
- `google_ads_id` → e.g. `AW-6316159162`
- `google_ads_booking_label` → conversion label for booking completion
- `google_ads_phone_label` → conversion label for phone clicks

### How it works:
1. Root layout reads these 3 values from the database
2. If `google_ads_id` is set, it loads the Google Ads gtag.js script
3. It injects all 3 values into `window.__ADS_CONFIG` for client-side use
4. `trackBookingConversion()` fires `gtag('event', 'conversion', { send_to: 'AW-xxx/label' })` on /booking/success page load
5. `trackPhoneClick()` fires the phone conversion on every tel: link click site-wide

### DataLayer events already pushed (for GTM triggers):
| Event               | When                          | Parameters                    |
|---------------------|-------------------------------|-------------------------------|
| booking_modal_open  | User clicks "Book Appointment"| —                             |
| service_selected    | User picks a service          | service_name                  |
| booking_created     | User submits booking form     | service_name, commissioner_id |
| begin_checkout      | User confirms time slot       | value (CAD), currency         |
| purchase            | Stripe checkout initiated     | value (CAD), currency         |
| phone_click         | User clicks phone number link | location                      |
| booking_conversion  | Booking success page loads    | —                             |

## Task 1: Create/Verify Google Ads Conversion Actions

### Conversion 1: "Oath Commissioner Online Booking"
- Category: BOOK_APPOINTMENT (or PURCHASE if not available)
- Type: Website
- Conversion value: Use default value $40 CAD
- Count: One conversion per click
- Click-through window: 30 days
- View-through window: 1 day
- Attribution: Data-driven

### Conversion 2: "Call Calgary Oaths (587-600-0746)"
- Category: PHONE_CALL_LEAD
- Type: Website (click-to-call tracking via onclick, NOT call forwarding)
- Phone number: 5876000746
- Conversion value: $20 CAD (secondary conversion)
- Count: One conversion per click
- Click-through window: 30 days
- IMPORTANT: There may already be a conversion action with phone number 5876000786 — that belongs to cethos.com, do NOT modify it. Create a NEW action for 5876000746 if one doesn't exist.

## Task 2: Get Conversion Labels

After creating/verifying both conversion actions:
1. Get the **Conversion Label** for each action
2. These need to be entered into the website's admin panel at /admin/settings:
   - `google_ads_booking_label` → label from "Oath Commissioner Online Booking"
   - `google_ads_phone_label` → label from "Call Calgary Oaths (587-600-0746)"

Report the labels so the admin can enter them.

## Task 3: Set Up GTM Tags (if GTM container is available)

If you have access to the GTM container, create these tags:

### Tag: Google Ads Conversion — Booking
- Tag type: Google Ads Conversion Tracking
- Conversion ID: AW-6316159162
- Conversion Label: (from Task 2)
- Conversion Value: {{DLV - value}} (Data Layer Variable)
- Currency Code: CAD
- Trigger: Custom Event — event name = `booking_conversion`

### Tag: Google Ads Conversion — Phone Click
- Tag type: Google Ads Conversion Tracking
- Conversion ID: AW-6316159162
- Conversion Label: (from Task 2)
- Trigger: Custom Event — event name = `phone_click`

### Tag: Google Ads Remarketing
- Tag type: Google Ads Remarketing
- Conversion ID: AW-6316159162
- Trigger: All Pages

## Task 4: Verify Auto-Tagging

Check that auto-tagging is enabled on the Google Ads account:
- Settings → Account Settings → Auto-tagging should be ON
- This ensures gclid parameters are appended to ad click URLs

## Task 5: Report

After completing setup, provide a summary with:
1. Conversion action IDs and labels created
2. GTM tags created (if applicable)
3. The exact values to enter in /admin/settings:
   - google_ads_id = AW-6316159162
   - google_ads_booking_label = ???
   - google_ads_phone_label = ???
4. Any issues found (e.g. duplicate conversion actions, misconfigured settings)
```
