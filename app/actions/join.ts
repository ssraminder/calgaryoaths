'use server';

import { z } from 'zod';
import { sendEmail } from '@/lib/email';

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
  mobileAvailable: z.string().min(1, 'Please indicate mobile availability'),
  languages: z.string().min(2, 'Languages are required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  serviceRadius: z.string().min(1, 'Service radius is required'),
  availability: z.string().min(1, 'Availability is required'),
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
    await sendEmail({
      to: 'info@calgaryoaths.com',
      replyTo: d.email,
      subject: `New commissioner network application — ${d.fullName}`,
      html: `
        <h2>New Commissioner Network Application</h2>
        <h3>Personal Information</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Full Name</td><td style="padding:8px;border:1px solid #ddd">${d.fullName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${d.email}">${d.email}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${d.phone}">${d.phone}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">City</td><td style="padding:8px;border:1px solid #ddd">${d.city}</td></tr>
        </table>
        <h3>Credentials</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Credential Types</td><td style="padding:8px;border:1px solid #ddd">${d.credentialTypes}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Year Credentialed</td><td style="padding:8px;border:1px solid #ddd">${d.yearCredentialed}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Currently Active?</td><td style="padding:8px;border:1px solid #ddd">${d.credentialsActive}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Insurance</td><td style="padding:8px;border:1px solid #ddd">${d.insurance}</td></tr>
        </table>
        <h3>Services & Availability</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Services</td><td style="padding:8px;border:1px solid #ddd">${d.servicesOffered}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mobile Available</td><td style="padding:8px;border:1px solid #ddd">${d.mobileAvailable}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Languages</td><td style="padding:8px;border:1px solid #ddd">${d.languages}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Postal Code</td><td style="padding:8px;border:1px solid #ddd">${d.postalCode}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service Radius</td><td style="padding:8px;border:1px solid #ddd">${d.serviceRadius}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Availability</td><td style="padding:8px;border:1px solid #ddd">${d.availability}</td></tr>
        </table>
      `,
    });

    return { success: true, message: "Thanks for applying! We'll be in touch within 2 business days." };
  } catch (err) {
    console.error('Join form email error:', err);
    return {
      success: false,
      message: 'Something went wrong. Please email us at info@calgaryoaths.com.',
    };
  }
}
