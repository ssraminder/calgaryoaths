import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, code } = (await req.json()) as { email?: string; code?: string };
  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();

  // Find the latest unused, unexpired OTP with fewer than 3 attempts
  const { data: otp } = await supabaseAdmin
    .from('co_otp_codes')
    .select('*')
    .eq('email', normalised)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .lt('attempts', 3)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otp) {
    return NextResponse.json(
      { error: 'Invalid or expired code. Please request a new one.' },
      { status: 401 }
    );
  }

  // Increment attempts
  await supabaseAdmin
    .from('co_otp_codes')
    .update({ attempts: otp.attempts + 1 })
    .eq('id', otp.id);

  // Timing-safe comparison
  const submittedHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  const storedBuf = Buffer.from(otp.otp_hash, 'hex');
  const submittedBuf = Buffer.from(submittedHash, 'hex');

  if (storedBuf.length !== submittedBuf.length || !crypto.timingSafeEqual(storedBuf, submittedBuf)) {
    const remaining = 2 - otp.attempts; // after increment
    return NextResponse.json(
      { error: remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Please request a new code.' },
      { status: 401 }
    );
  }

  // Mark used and clean up all OTPs for this email
  await supabaseAdmin.from('co_otp_codes').delete().eq('email', normalised);

  // Verify the user is a vendor
  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('user_id')
    .eq('email', normalised)
    .not('user_id', 'is', null)
    .single();

  if (!commissioner) {
    return NextResponse.json({ error: 'Account not found' }, { status: 401 });
  }

  // Generate a magic link to create a real Supabase session
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalised,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  return NextResponse.json({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
}
