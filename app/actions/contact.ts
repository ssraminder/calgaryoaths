'use server';

import { z } from 'zod';
import { Resend } from 'resend';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  service: z.string().min(1, 'Please select a service'),
  location: z.string().min(1, 'Please select a location preference'),
  message: z.string().optional(),
  honeypot: z.string().max(0, 'Bot detected'),
});

export type ContactFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    service: formData.get('service') as string,
    location: formData.get('location') as string,
    message: formData.get('message') as string,
    honeypot: formData.get('honeypot') as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    // Silently reject bots
    if (raw.honeypot) {
      return { success: true, message: `Thanks ${raw.name} — we'll get back to you within 2 hours.` };
    }
    return {
      success: false,
      message: 'Please fix the errors below.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, phone, email, service, location, message } = parsed.data;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Calgary Oaths Website <noreply@calgaryoaths.com>',
      to: ['info@calgaryoaths.com'],
      reply_to: email,
      subject: `New contact form submission — ${service}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${phone}">${phone}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service needed</td><td style="padding:8px;border:1px solid #ddd">${service}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Preferred location</td><td style="padding:8px;border:1px solid #ddd">${location}</td></tr>
          ${message ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>` : ''}
        </table>
      `,
    });

    return {
      success: true,
      message: `Thanks ${name} — we'll get back to you within 2 hours.`,
    };
  } catch (err) {
    console.error('Contact form email error:', err);
    return {
      success: false,
      message: 'Something went wrong. Please call us at (587) 600-0746.',
    };
  }
}
