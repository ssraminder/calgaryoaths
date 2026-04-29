export type OrderType = 'apostille' | 'notarization';

export type OrderStatus =
  | 'draft'
  | 'awaiting_customer'
  | 'customer_completed'
  | 'awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled';

export type ServiceRole = 'notary' | 'oath_commissioner';

export type AuthenticationType = 'apostille' | 'authentication_legalization' | 'both';
export type DeliveryMethod = 'pickup' | 'courier';
export type DeliveryMode = 'in_office' | 'mobile' | 'virtual';

export type PaymentMethod = 'cash' | 'e_transfer' | 'debit' | 'credit' | 'cheque' | 'other';

export interface OrderItem {
  id?: string;
  position: number;
  item_type: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  gov_fee_cents: number | null;
  notes: string | null;
  line_total_cents: number;
}

export interface OrderIdPhoto {
  id: string;
  order_id: string;
  label: string;
  photo_url: string;
  position: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  staff_user_id: string | null;

  order_date: string;
  expedited: boolean;
  notes_internal: string | null;
  estimated_turnaround_days: number | null;

  // Apostille
  destination_country: string | null;
  authentication_type: AuthenticationType | null;
  notarization_required: boolean | null;
  translation_required: boolean | null;
  translation_language: string | null;
  delivery_method: DeliveryMethod | null;

  // Notarization
  service_subtypes: string[] | null;
  service_role: ServiceRole | null;
  performed_by_commissioner_id: string | null;
  delivery_mode: DeliveryMode | null;
  mobile_address: string | null;
  travel_fee_cents: number | null;

  // Customer (typed ID fields and DOB removed; ID captured via uploaded photos)
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address_street: string | null;
  customer_address_unit: string | null;
  customer_address_city: string | null;
  customer_address_province: string | null;
  customer_address_postal: string | null;
  customer_address_country: string | null;
  customer_notes: string | null;

  // Terms + signature
  terms_version_id: string | null;
  terms_accepted_at: string | null;
  signature_url: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;

  // Pricing
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  discount_cents: number | null;
  discount_reason: string | null;
  tax_province_code: string | null;

  // Payment
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  amount_paid_cents: number | null;
  paid_at: string | null;
  paid_recorded_by: string | null;

  // Invoice
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  invoice_generated_at: string | null;

  // Handoff
  handoff_token: string | null;
  handoff_token_expires_at: string | null;
  handoff_used_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
}
