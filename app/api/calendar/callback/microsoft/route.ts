// OAuth callback for Microsoft Calendar — exchanges auth code for tokens,
// stores connection in co_calendar_connections, and redirects to vendor calendar page.
import { NextRequest, NextResponse } from 'next/server';
import { saveOAuthConnection } from '@/lib/calendar-oauth';
import { microsoftExchangeCode, microsoftListCalendars, CalendarAuthError } from '@/lib/calendar-providers';
import { verifyVendor } from '@/lib/vendor-auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const commissionerId = searchParams.get('state');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // User declined consent, or the identity provider refused the request
  const providerError = searchParams.get('error');
  if (providerError) {
    console.error(`Microsoft OAuth error: ${providerError} — ${searchParams.get('error_description') || ''}`);
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=microsoft_${providerError === 'access_denied' ? 'access_denied' : 'auth_failed'}`);
  }

  if (!code || !commissionerId) {
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=missing_params`);
  }

  // `state` is only the commissioner ID, which is public (it's in booking URLs). Require the
  // logged-in vendor to own it, so nobody can attach their own calendar to another vendor's
  // account and receive that vendor's customer details.
  const vendor = await verifyVendor(req);
  if (!vendor || vendor.commissionerId !== commissionerId) {
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=session_mismatch`);
  }

  try {
    const tokens = await microsoftExchangeCode(code);
    const calendars = await microsoftListCalendars(tokens.access_token);
    const primary = calendars.find((c) => c.primary) || calendars[0];

    if (!primary) {
      return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=no_calendars`);
    }

    await saveOAuthConnection(commissionerId, 'microsoft', primary, tokens);

    return NextResponse.redirect(`${siteUrl}/vendor/calendar?connected=microsoft`);
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    // e.g. expired client secret: an admin has to fix it, retrying won't help
    if (err instanceof CalendarAuthError && err.kind === 'config_error') {
      return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=config_error`);
    }
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=microsoft_auth_failed`);
  }
}
