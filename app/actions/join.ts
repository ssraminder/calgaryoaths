'use server';

import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

const joinSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  city: z.string().min(2, 'City is required'),
  credentialTypes: z.string().min(1, 'Please select at least one credential'),
  yearCredentialed: z.string().min(4, 'Year credentialed is required'),
  credentialsActive: z.string().min(1, 'Please indicate if credentials are active'),
  insurance: z.string().min(1, 'Please indicate insurance status'),
  servicesOffered: z.string().min(1, 'Please select at least one service'),
  languages: z.string().min(2, 'Languages are required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  serviceRadius: z.string().min(1, 'Service radius is required'),
  // Delivery modes
  mobileAvailable: z.string().min(1, 'Please indicate mobile availability'),
  mobileTravelFee: z.string().optional(),
  virtualAvailable: z.string().optional(),
  // Pricing
  firstPageRate: z.string().min(1, 'First page rate is required'),
  additionalPageRate: z.string().min(1, 'Additional page rate is required'),
  draftingRate: z.string().optional(),
  // Consents
  confirmAccurate: z.literal('true', { errorMap: () => ({ message: 'You must confirm information is accurate' }) }),
  agreeTerms: z.literal('true', { errorMap: () => ({ message: 'You must agree to the partner terms' }) }),
});

export type JoinFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function submitJoinForm(
  prevState: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Please fix the errors below.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const d = parsed.data;

  try {
    await supabase.from('co_partner_applications').insert({
      full_name: d.fullName,
      email: d.email,
      phone: d.phone,
      city: d.city,
      credential_types: d.credentialTypes,
      year_credentialed: d.yearCredentialed,
      credentials_active: d.credentialsActive,
      insurance: d.insurance,
      services_offered: d.servicesOffered,
      mobile_available: d.mobileAvailable,
      mobile_travel_fee: d.mobileTravelFee || null,
      virtual_available: d.virtualAvailable || null,
      languages: d.languages,
      postal_code: d.postalCode,
      service_radius: d.serviceRadius,
      first_page_rate: d.firstPageRate,
      additional_page_rate: d.additionalPageRate,
      drafting_rate: d.draftingRate || null,
    });

    await sendEmail({
      to: 'info@calgaryoaths.com',
      replyTo: d.email,
      subject: `New partner application — ${d.fullName}`,
      html: `
        <h2>New Partner Application</h2>
        <h3>Personal Information</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Full Name</td><td style="padding:8px;border:1px solid #ddd">${d.fullName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${d.email}">${d.email}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${d.phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">City</td><td style="padding:8px;border:1px solid #ddd">${d.city}</td></tr>
        </table>
        <h3>Credentials</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Credential Types</td><td style="padding:8px;border:1px solid #ddd">${d.credentialTypes}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Year Credentialed</td><td style="padding:8px;border:1px solid #ddd">${d.yearCredentialed}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Currently Active?</td><td style="padding:8px;border:1px solid #ddd">${d.credentialsActive}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Insurance</td><td style="padding:8px;border:1px solid #ddd">${d.insurance}</td></tr>
        </table>
        <h3>Services & Pricing</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Services Offered</td><td style="padding:8px;border:1px solid #ddd">${d.servicesOffered}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">First Page Rate</td><td style="padding:8px;border:1px solid #ddd">$${d.firstPageRate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Additional Page Rate</td><td style="padding:8px;border:1px solid #ddd">$${d.additionalPageRate}</td></tr>
          ${d.draftingRate ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Drafting Rate</td><td style="padding:8px;border:1px solid #ddd">$${d.draftingRate}</td></tr>` : ''}
        </table>
        <h3>Delivery & Location</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mobile Available</td><td style="padding:8px;border:1px solid #ddd">${d.mobileAvailable}</td></tr>
          ${d.mobileTravelFee ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mobile Travel Fee</td><td style="padding:8px;border:1px solid #ddd">$${d.mobileTravelFee}</td></tr>` : ''}
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Virtual Available</td><td style="padding:8px;border:1px solid #ddd">${d.virtualAvailable || 'Not specified'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Languages</td><td style="padding:8px;border:1px solid #ddd">${d.languages}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Postal Code</td><td style="padding:8px;border:1px solid #ddd">${d.postalCode}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service Radius</td><td style="padding:8px;border:1px solid #ddd">${d.serviceRadius}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;">Availability will be configured in the partner portal after approval.</p>
      `,
    });

    return { success: true, message: "Thanks for applying! We'll review your application and be in touch within 2 business days." };
  } catch (err) {
    console.error('Join form error:', err);
    return {
      success: false,
      message: 'Something went wrong. Please email us at info@calgaryoaths.com.',
    };
  }
}
