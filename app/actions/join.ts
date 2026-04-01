'use server';

import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-server';

const joinSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  address: z.string().min(5, 'Full address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  credentialTypes: z.string().min(1, 'Please select at least one credential'),
  yearCredentialed: z.string().min(4, 'Year credentialed is required'),
  credentialsActive: z.string().min(1, 'Please indicate if credentials are active'),
  insurance: z.string().min(1, 'Please indicate insurance status'),
  servicesOffered: z.string().min(1, 'Please select at least one service'),
  languagesJson: z.string().min(2, 'At least one language is required'),
  mobileAvailable: z.string().optional(),
  virtualAvailable: z.string().optional(),
  areasServedJson: z.string().optional(),
  gstNumber: z.string().optional(),
  gstRegistered: z.string().optional(),
  referralSource: z.string().optional(),
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

  // Validate passwords match
  if (d.password !== d.confirmPassword) {
    return {
      success: false,
      message: 'Passwords do not match.',
      errors: { confirmPassword: ['Passwords do not match'] },
    };
  }

  // Parse JSON fields
  const languages: string[] = JSON.parse(d.languagesJson || '["English"]');
  const areasServed: string[] = JSON.parse(d.areasServedJson || '[]');
  const gstRegistered = d.gstRegistered === 'true';

  try {
    // 1. Check email isn't already in use
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    if (existingUsers?.users?.some((u) => u.email === d.email)) {
      return {
        success: false,
        message: 'An account with this email already exists. Please use a different email or log in to the partner portal.',
        errors: { email: ['Email already in use'] },
      };
    }

    // 2. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      return {
        success: false,
        message: authErr?.message || 'Failed to create account. Please try again.',
      };
    }

    const userId = authData.user.id;

    // 3. Create profile with vendor role
    await supabaseAdmin.from('co_profiles').insert({
      id: userId,
      email: d.email,
      full_name: d.fullName,
      role: 'vendor',
    });

    // 4. Create commissioner record (inactive — admin must approve)
    const commissionerId = d.fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await supabaseAdmin.from('co_commissioners').insert({
      id: commissionerId,
      name: d.fullName,
      title: d.credentialTypes.split(',')[0]?.trim() || 'Commissioner of Oaths',
      email: d.email,
      phone: d.phone,
      address: d.address,
      languages,
      credentials: d.credentialTypes.split(',').map((c: string) => c.trim()),
      areas_served: areasServed,
      nearby_neighbourhoods: areasServed,
      mobile_available: d.mobileAvailable === 'Yes' || d.mobileAvailable === 'Sometimes',
      virtual_available: d.virtualAvailable === 'Yes',
      gst_number: d.gstNumber || null,
      gst_registered: gstRegistered,
      user_id: userId,
      active: false, // Admin must approve
      sort_order: 99,
    });

    // 5. Upload credential file if provided
    const credentialFile = formData.get('credentialFile') as File | null;
    let credentialFileUrl = '';
    if (credentialFile && credentialFile.size > 0) {
      const ext = credentialFile.name.split('.').pop() || 'pdf';
      const path = `credentials/${commissionerId}/certificate_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await credentialFile.arrayBuffer());

      await supabaseAdmin.storage
        .from('appointment-documents')
        .upload(path, buffer, { contentType: credentialFile.type, upsert: false });

      const { data: urlData } = await supabaseAdmin.storage
        .from('appointment-documents')
        .createSignedUrl(path, 365 * 24 * 60 * 60); // 1 year

      credentialFileUrl = urlData?.signedUrl || path;
    }

    // 6. Save application record
    await supabaseAdmin.from('co_partner_applications').insert({
      full_name: d.fullName,
      email: d.email,
      phone: d.phone,
      address: d.address,
      credential_types: d.credentialTypes,
      year_credentialed: d.yearCredentialed,
      credentials_active: d.credentialsActive,
      insurance: d.insurance,
      services_offered: d.servicesOffered,
      mobile_available: d.mobileAvailable || 'No',
      virtual_available: d.virtualAvailable || null,
      languages: languages.join(', '),
      areas_served: areasServed.join(', '),
      gst_number: d.gstNumber || null,
      gst_registered: gstRegistered,
      referral_source: d.referralSource || null,
      credential_file_url: credentialFileUrl || null,
      commissioner_id: commissionerId,
      user_id: userId,
      status: 'pending',
    });

    // 7. Send notification email
    await sendEmail({
      to: 'info@calgaryoaths.com',
      replyTo: d.email,
      subject: `New partner application — ${d.fullName}`,
      html: `
        <h2>New Partner Application</h2>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${d.fullName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${d.email}">${d.email}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${d.phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Address</td><td style="padding:8px;border:1px solid #ddd">${d.address}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Credentials</td><td style="padding:8px;border:1px solid #ddd">${d.credentialTypes} (${d.yearCredentialed})</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Active?</td><td style="padding:8px;border:1px solid #ddd">${d.credentialsActive}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Insurance</td><td style="padding:8px;border:1px solid #ddd">${d.insurance}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Services</td><td style="padding:8px;border:1px solid #ddd">${d.servicesOffered}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Languages</td><td style="padding:8px;border:1px solid #ddd">${languages.join(', ')}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Areas</td><td style="padding:8px;border:1px solid #ddd">${areasServed.join(', ') || 'Not specified'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mobile</td><td style="padding:8px;border:1px solid #ddd">${d.mobileAvailable || 'No'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Virtual</td><td style="padding:8px;border:1px solid #ddd">${d.virtualAvailable || 'No'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">GST</td><td style="padding:8px;border:1px solid #ddd">${gstRegistered ? `Yes — ${d.gstNumber}` : 'No'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Referral</td><td style="padding:8px;border:1px solid #ddd">${d.referralSource || 'Not specified'}</td></tr>
          ${credentialFileUrl ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Credential</td><td style="padding:8px;border:1px solid #ddd"><a href="${credentialFileUrl}">View uploaded certificate</a></td></tr>` : ''}
        </table>
        <p><strong>Commissioner ID:</strong> ${commissionerId}</p>
        <p><strong>Account created:</strong> Yes (inactive — set active=true in admin to approve)</p>
        <p style="color:#888;font-size:12px;">To approve: go to Admin → Vendors → ${d.fullName} → check "Active" and save.</p>
      `,
    }).catch((err) => console.error('Join notification email error:', err));

    return {
      success: true,
      message: "Thanks for applying! We've created your partner account. We'll review your application and activate your profile within 2 business days.",
    };
  } catch (err) {
    console.error('Join form error:', err);
    return {
      success: false,
      message: 'Something went wrong. Please email us at info@calgaryoaths.com.',
    };
  }
}
