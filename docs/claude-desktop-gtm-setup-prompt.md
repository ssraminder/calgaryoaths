# Claude Desktop Prompt: Google Analytics 4 & GTM Setup for Calgary Oaths

Copy and paste this prompt into Claude Desktop to set up your Google Analytics and GTM containers.

---

## Prompt

```
I need help setting up Google Analytics 4 (GA4) and Google Tag Manager (GTM) for my website calgaryoaths.com — a Commissioner of Oaths booking service in Calgary.

I have both Google Analytics (analytics.google.com) and Google Tag Manager (tagmanager.google.com) open in tabs within this tab group. Please use them to complete the setup.

## Current Setup

The website already has:
- GA4 and GTM scripts integrated via Next.js (IDs stored in Supabase `co_settings` table with keys `ga4_id` and `gtm_id`)
- Custom dataLayer events pushed from the frontend booking flow

## Step 1: Create GA4 Property

1. Go to https://analytics.google.com → Admin → Create Property
2. Property name: "Calgary Oaths"
3. Time zone: Mountain Time (Canada)
4. Currency: CAD
5. Create a Web data stream for `calgaryoaths.com`
6. Copy the **Measurement ID** (format: G-XXXXXXXXXX)

## Step 2: Create GTM Container

1. Go to https://tagmanager.google.com → Create Account
2. Account name: "Calgary Oaths"
3. Container name: "calgaryoaths.com"
4. Target platform: Web
5. Copy the **Container ID** (format: GTM-XXXXXXX)

## Step 3: Store IDs in Supabase Database

Run these SQL statements in the Supabase SQL Editor (Dashboard → SQL Editor):

```sql
INSERT INTO co_settings (key, value) VALUES ('ga4_id', 'G-XXXXXXXXXX')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO co_settings (key, value) VALUES ('gtm_id', 'GTM-XXXXXXX')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Replace `G-XXXXXXXXXX` and `GTM-XXXXXXX` with your actual IDs.

## Step 4: Configure GTM Tags

In Google Tag Manager, create the following tags:

### Tag 1: GA4 Configuration
- Tag type: Google Analytics: GA4 Configuration
- Measurement ID: {{GA4 ID}} (create a Constant variable with your GA4 Measurement ID)
- Trigger: All Pages

### Tag 2: Booking Modal Open
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `booking_modal_open`
- Trigger: Custom Event — Event name = `booking_modal_open`

### Tag 3: Service Selected
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `service_selected`
- Event Parameters:
  - service_name = {{DLV - service_name}} (create a Data Layer Variable)
- Trigger: Custom Event — Event name = `service_selected`

### Tag 4: Booking Created
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `booking_created`
- Event Parameters:
  - service_name = {{DLV - service_name}}
  - commissioner_id = {{DLV - commissioner_id}} (create a Data Layer Variable)
- Trigger: Custom Event — Event name = `booking_created`

### Tag 5: Begin Checkout (Conversion with Value)
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `begin_checkout`
- Event Parameters:
  - value = {{DLV - value}} (create a Data Layer Variable)
  - currency = {{DLV - currency}} (create a Data Layer Variable)
- Trigger: Custom Event — Event name = `begin_checkout`

### Tag 6: Purchase / Conversion (Conversion with Value)
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `purchase`
- Event Parameters:
  - value = {{DLV - value}}
  - currency = {{DLV - currency}}
- Trigger: Custom Event — Event name = `purchase`

### Tag 7: Phone Click
- Tag type: Google Analytics: GA4 Event
- Configuration Tag: select your GA4 Configuration tag
- Event name: `phone_click`
- Event Parameters:
  - location = {{DLV - location}} (create a Data Layer Variable)
- Trigger: Custom Event — Event name = `phone_click`

## Step 5: Create Data Layer Variables in GTM

Create these Data Layer Variables (Variables → User-Defined Variables → New):

| Variable Name        | Data Layer Variable Name |
|----------------------|--------------------------|
| DLV - service_name   | service_name             |
| DLV - commissioner_id| commissioner_id          |
| DLV - value          | value                    |
| DLV - currency       | currency                 |
| DLV - location       | location                 |

## Step 6: Mark Conversions in GA4

1. Go to GA4 → Admin → Events
2. Mark these events as conversions (toggle the "Mark as conversion" switch):
   - `purchase` — This is the primary conversion (booking deposit paid)
   - `begin_checkout` — Secondary conversion (slot confirmed)
   - `booking_created` — Micro-conversion (form submitted)
3. For `purchase` and `begin_checkout`, the `value` and `currency` parameters are already sent, so GA4 will automatically attribute monetary value to these conversions

## Step 7: Set Up Google Ads Conversion Tracking (Optional)

If running Google Ads:

1. In Google Ads → Tools → Conversions → New conversion action → Import → Google Analytics 4
2. Import the `purchase` conversion
3. Set conversion value to "Use the value from the event" 
4. Attribution model: Data-driven (recommended)

### GTM Tag for Google Ads Conversion:
- Tag type: Google Ads Conversion Tracking
- Conversion ID: (from Google Ads)
- Conversion Label: (from Google Ads)
- Conversion Value: {{DLV - value}}
- Currency Code: CAD
- Trigger: Custom Event — Event name = `purchase`

## Step 8: Publish & Verify

1. In GTM, click **Submit** → **Publish** your container
2. Use GTM Preview mode to verify tags fire correctly
3. On the live site, open the booking modal, go through the flow, and check:
   - GA4 Realtime report shows events
   - GTM Preview shows tags firing
4. Deploy the website if not already done

## DataLayer Events Reference

These events are automatically pushed by the website code:

| Event              | When                              | Parameters                    |
|--------------------|-----------------------------------|-------------------------------|
| booking_modal_open | User clicks "Book Appointment"    | —                             |
| service_selected   | User picks a service (Step 1→2)   | service_name                  |
| booking_created    | User submits details (Step 2)     | service_name, commissioner_id |
| begin_checkout     | User confirms slot (Step 3)       | value (CAD), currency         |
| purchase           | Redirect to Stripe payment        | value (CAD), currency         |
| phone_click        | User clicks phone number          | location                      |

## Conversion Values

- Downtown Calgary (Raminder Shah): $40 deposit
- NE Calgary (Amrita Shah): $30 deposit
```
