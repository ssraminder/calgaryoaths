-- Migration: Apostille & Notarization order forms
-- Adds work-order intake system separate from appointment bookings:
--   - co_orders: base order with service-specific, customer, T&C, payment, invoice fields
--   - co_order_items: itemized line items (per-document)
--   - co_terms_versions: versioned T&C content for audit-traceable customer acceptance

-- T&C versions
CREATE TABLE IF NOT EXISTS co_terms_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type text NOT NULL CHECK (form_type IN ('apostille', 'notarization', 'general')),
  version text NOT NULL,
  content_md text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_type, version)
);

CREATE INDEX IF NOT EXISTS idx_terms_versions_active
  ON co_terms_versions (form_type, effective_from DESC);

-- Order number sequences (one per type, formatted server-side as APO-YYYY-NNNN / NOT-YYYY-NNNN)
CREATE SEQUENCE IF NOT EXISTS co_order_apo_seq;
CREATE SEQUENCE IF NOT EXISTS co_order_not_seq;

-- Helper: returns the next sequence value for a given order type (callable via supabase.rpc)
CREATE OR REPLACE FUNCTION next_order_number(p_type text)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT CASE p_type
    WHEN 'apostille' THEN nextval('co_order_apo_seq')
    WHEN 'notarization' THEN nextval('co_order_not_seq')
    ELSE NULL
  END;
$$;

-- Orders
CREATE TABLE IF NOT EXISTS co_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('apostille', 'notarization')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'awaiting_customer', 'customer_completed',
    'awaiting_payment', 'paid', 'completed', 'cancelled'
  )),
  staff_user_id uuid REFERENCES co_profiles(id) ON DELETE SET NULL,

  -- Common service fields
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expedited boolean NOT NULL DEFAULT false,
  notes_internal text,
  estimated_turnaround_days integer,

  -- Apostille-specific (nullable)
  destination_country text,
  authentication_type text CHECK (authentication_type IS NULL OR authentication_type IN (
    'apostille', 'authentication_legalization', 'both'
  )),
  notarization_required boolean,
  translation_required boolean,
  translation_language text,
  delivery_method text CHECK (delivery_method IS NULL OR delivery_method IN ('pickup', 'courier')),

  -- Notarization-specific (nullable)
  service_subtypes text[],
  service_role text CHECK (service_role IS NULL OR service_role IN ('notary', 'oath_commissioner')),
  performed_by_commissioner_id text REFERENCES co_commissioners(id) ON DELETE SET NULL,
  delivery_mode text CHECK (delivery_mode IS NULL OR delivery_mode IN ('in_office', 'mobile', 'virtual')),
  mobile_address text,
  travel_fee_cents integer,

  -- Customer details (filled during customer step). Typed ID fields removed: ID is captured
  -- via uploaded photos by staff (see co_order_id_photos). DOB still captured via the form.
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_dob date,
  customer_address_street text,
  customer_address_unit text,
  customer_address_city text,
  customer_address_province text,
  customer_address_postal text,
  customer_address_country text,
  customer_notes text,

  -- T&C + signature
  terms_version_id uuid REFERENCES co_terms_versions(id) ON DELETE SET NULL,
  terms_accepted_at timestamptz,
  signature_url text,
  signed_at timestamptz,
  signed_ip inet,
  signed_user_agent text,

  -- Pricing
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  discount_cents integer DEFAULT 0,
  discount_reason text,

  -- Manual payment
  payment_method text CHECK (payment_method IS NULL OR payment_method IN (
    'cash', 'e_transfer', 'debit', 'credit', 'cheque', 'other'
  )),
  payment_reference text,
  amount_paid_cents integer,
  paid_at timestamptz,
  paid_recorded_by uuid REFERENCES co_profiles(id) ON DELETE SET NULL,

  -- Invoice
  invoice_number text,
  invoice_pdf_url text,
  invoice_generated_at timestamptz,

  -- Web→tablet handoff
  handoff_token text UNIQUE,
  handoff_token_expires_at timestamptz,
  handoff_used_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON co_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_type ON co_orders(order_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_staff ON co_orders(staff_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_handoff_token ON co_orders(handoff_token) WHERE handoff_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_email ON co_orders(customer_email) WHERE customer_email IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_co_orders_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_co_orders_updated_at ON co_orders;
CREATE TRIGGER trg_co_orders_updated_at
  BEFORE UPDATE ON co_orders
  FOR EACH ROW EXECUTE FUNCTION set_co_orders_updated_at();

-- Order line items
CREATE TABLE IF NOT EXISTS co_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES co_orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  item_type text,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL DEFAULT 0,
  gov_fee_cents integer DEFAULT 0,
  notes text,
  line_total_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON co_order_items(order_id, position);

-- ID photos uploaded by staff (front/back, multiple parties). Optional for apostille,
-- required for notarization (enforced in API/UX, not at DB level so drafts can save).
CREATE TABLE IF NOT EXISTS co_order_id_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES co_orders(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  photo_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES co_profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_id_photos_order ON co_order_id_photos(order_id, position);

-- RLS
ALTER TABLE co_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_order_id_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_terms_versions ENABLE ROW LEVEL SECURITY;

-- Authenticated staff (admin/owner/viewer or vendor) can read/write all orders.
-- Customers are NOT authenticated; the customer handoff route uses the service role key
-- after validating the handoff_token in the API layer.

DROP POLICY IF EXISTS "staff_read_orders" ON co_orders;
CREATE POLICY "staff_read_orders" ON co_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'viewer', 'vendor')
    )
  );

DROP POLICY IF EXISTS "staff_write_orders" ON co_orders;
CREATE POLICY "staff_write_orders" ON co_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  );

DROP POLICY IF EXISTS "staff_read_order_items" ON co_order_items;
CREATE POLICY "staff_read_order_items" ON co_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'viewer', 'vendor')
    )
  );

DROP POLICY IF EXISTS "staff_write_order_items" ON co_order_items;
CREATE POLICY "staff_write_order_items" ON co_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  );

DROP POLICY IF EXISTS "staff_read_order_id_photos" ON co_order_id_photos;
CREATE POLICY "staff_read_order_id_photos" ON co_order_id_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'viewer', 'vendor')
    )
  );

DROP POLICY IF EXISTS "staff_write_order_id_photos" ON co_order_id_photos;
CREATE POLICY "staff_write_order_id_photos" ON co_order_id_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'vendor')
    )
  );

-- T&C versions are readable by any authenticated user (staff fetches before showing form);
-- public anon access goes through the API layer using service role.
DROP POLICY IF EXISTS "auth_read_terms" ON co_terms_versions;
CREATE POLICY "auth_read_terms" ON co_terms_versions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_terms" ON co_terms_versions;
CREATE POLICY "admin_write_terms" ON co_terms_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM co_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin')
    )
  );

-- Seed initial T&C versions
INSERT INTO co_terms_versions (form_type, version, content_md, effective_from)
VALUES
('apostille', 'v1.0', $TERMS$
# Apostille & Authentication Service Agreement

By signing below, I confirm and agree to the following:

1. **Information accuracy.** The personal information and identification details I have provided are true and accurate. I understand that any willful misrepresentation may invalidate the service and may be reported to relevant authorities.

2. **Document handling.** I authorize Calgary Oaths to handle, transport, and submit my documents to the relevant Canadian and foreign government offices for the purpose of obtaining apostille, authentication, or legalization as required.

3. **Government fees & timing.** Government processing fees and timelines are set by the issuing authorities and are outside Calgary Oaths' control. Estimated turnaround times are best estimates only and are not guaranteed.

4. **Third-party couriers and consulates.** Calgary Oaths is not liable for delays, damage, or loss caused by third-party courier services, consulates, embassies, or government offices.

5. **Refund policy.** Government fees are non-refundable once paid to the issuing authority. Service fees are refundable only if the order has not yet been processed.

6. **Document return.** Documents will be returned in person, by courier, or by mail as agreed. I am responsible for providing a deliverable address.

7. **Privacy & ID storage.** My personal information will be used only for the purposes of completing this service and is handled in accordance with the Calgary Oaths privacy policy. Where photos of my government identification are taken (which is optional for apostille service), I consent to having those photos retained with this order record solely for service delivery, audit, fraud-prevention, and legal-compliance purposes. ID photos are stored securely and are not shared with third parties except as required to complete the requested service or by law.

8. **Authorization.** I authorize Calgary Oaths and its agents to act on my behalf for the purposes of completing this order.

I have read and agree to the terms above.
$TERMS$, now()),
('notarization', 'v1.0', $TERMS$
# Notarization & Oath Commissioner Service Agreement

By signing below, I confirm and agree to the following:

1. **Identification & ID photo storage.** I have presented valid government-issued photo identification. The information I have provided matches my identification documents and is accurate. I consent to Calgary Oaths taking and retaining digital photographs of my identification (including front and back where applicable) with this order record. These photographs are retained securely for the purposes of service delivery, audit, fraud-prevention, and legal-compliance, and are not shared with third parties except as required by law or to complete the requested service.

2. **Voluntary execution.** I am signing the document(s) and/or making any oath, affirmation, or declaration freely and voluntarily, without coercion, and I understand the contents of the document(s).

3. **Sound mind.** I confirm I am of legal age and sound mind to execute this/these document(s).

4. **Scope of service.** I understand that the notary public / commissioner of oaths is providing notarization, oath-administration, declaration, or signature-witnessing services only, and is not providing legal advice. I have been advised to seek independent legal counsel where appropriate.

5. **Truth of contents.** Where I am swearing or affirming the contents of an affidavit or statutory declaration, I affirm that the contents are true to the best of my knowledge and belief.

6. **Fees.** I agree to pay the fees set out for this order and acknowledge that the service is rendered upon payment.

7. **Privacy.** My personal information will be used only for the purposes of completing and recording this service and is handled in accordance with the Calgary Oaths privacy policy.

I have read and agree to the terms above.
$TERMS$, now())
ON CONFLICT (form_type, version) DO NOTHING;
