import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();

  // Rate limit: max 3 OTP requests per email per 15 minutes
  const { count } = await supabaseAdmin
    .from('co_otp_codes')
    .select('*', { count: 'exact', head: true })
    .eq('email', normalised)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Check if user exists as a vendor (but always return success for anti-enumeration)
  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('user_id, email')
    .eq('email', normalised)
    .not('user_id', 'is', null)
    .single();

  if (commissioner) {
    const code = crypto.randomInt(100000, 999999);
    const otpHash = crypto.createHash('sha256').update(code.toString()).digest('hex');

    await supabaseAdmin.from('co_otp_codes').insert({
      email: normalised,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    await sendEmail({
      to: normalised,
      subject: 'Your Calgary Oaths login code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a2744; margin: 0 0 8px;">Your login code</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Use this code to sign in to the Calgary Oaths Partner Portal.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1a2744;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">This code expires in 5 minutes. If you didn&rsquo;t request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
