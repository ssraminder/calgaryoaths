import { NextRequest, NextResponse } from 'next/server';
import { exchangeCronofyCode } from '@/lib/cronofy';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state'); // commissioner ID
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${siteUrl}/admin/vendors/${state}?calendar=error`);
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    await exchangeCronofyCode(code, state);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${siteUrl}/admin/vendors/${state}?calendar=connected`);
  } catch (err) {
    console.error('Cronofy callback error:', err);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${siteUrl}/admin/vendors/${state}?calendar=error`);
  }
}
