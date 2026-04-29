import { z } from 'zod';

export const orderItemSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(0),
  item_type: z.string().nullable().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().min(0),
  gov_fee_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

const apostilleFields = z.object({
  destination_country: z.string().nullable().optional(),
  authentication_type: z.enum(['apostille', 'authentication_legalization', 'both']).nullable().optional(),
  notarization_required: z.boolean().nullable().optional(),
  translation_required: z.boolean().nullable().optional(),
  translation_language: z.string().nullable().optional(),
  delivery_method: z.enum(['pickup', 'courier']).nullable().optional(),
});

const notarizationFields = z.object({
  service_subtypes: z.array(z.string()).nullable().optional(),
  service_role: z.enum(['notary', 'oath_commissioner']).nullable().optional(),
  performed_by_commissioner_id: z.string().nullable().optional(),
  delivery_mode: z.enum(['in_office', 'mobile', 'virtual']).nullable().optional(),
  mobile_address: z.string().nullable().optional(),
  travel_fee_cents: z.number().int().min(0).nullable().optional(),
});

export const staffSectionSchema = z.object({
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expedited: z.boolean().optional(),
  notes_internal: z.string().nullable().optional(),
  estimated_turnaround_days: z.number().int().min(0).nullable().optional(),
  tax_province_code: z.string().min(2).max(8).nullable().optional(),
  items: z.array(orderItemSchema).optional(),
}).merge(apostilleFields).merge(notarizationFields);

export const customerSectionSchema = z.object({
  customer_name: z.string().min(1, 'Full name is required'),
  customer_email: z.string().email('Valid email required'),
  customer_phone: z.string().min(1, 'Phone is required'),
  customer_address_street: z.string().min(1, 'Street address required'),
  customer_address_unit: z.string().nullable().optional(),
  customer_address_city: z.string().min(1, 'City required'),
  customer_address_province: z.string().min(1, 'Province required'),
  customer_address_postal: z.string().min(1, 'Postal code required'),
  customer_address_country: z.string().min(1, 'Country required'),
  customer_notes: z.string().nullable().optional(),
});

export const customerSubmitSchema = customerSectionSchema.extend({
  terms_version_id: z.string().uuid(),
  signature_data_url: z.string().startsWith('data:image/'),
});

export const paymentSchema = z.object({
  payment_method: z.enum(['cash', 'e_transfer', 'debit', 'credit', 'cheque', 'other']),
  payment_reference: z.string().nullable().optional(),
  amount_paid_cents: z.number().int().min(0),
});

export const newOrderSchema = z.object({
  order_type: z.enum(['apostille', 'notarization']),
});

export const idPhotoSchema = z.object({
  label: z.string().max(120).optional().default(''),
  photo_data_url: z.string().startsWith('data:image/'),
});

export type StaffSectionInput = z.infer<typeof staffSectionSchema>;
export type CustomerSectionInput = z.infer<typeof customerSectionSchema>;
export type CustomerSubmitInput = z.infer<typeof customerSubmitSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type IdPhotoInput = z.infer<typeof idPhotoSchema>;
