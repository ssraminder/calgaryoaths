// OAuth callback for Google Calendar — exchanges auth code for tokens,
// stores connection in co_calendar_connections, and redirects to vendor calendar page.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { googleExchangeCode, googleListCalendars } from '@/lib/calendar-providers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const commissionerId = searchParams.get('state');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!code || !commissionerId) {
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=missing_params`);
  }

  try {
    const tokens = await googleExchangeCode(code);
    const calendars = await googleListCalendars(tokens.access_token);
    const primary = calendars.find((c) => c.primary) || calendars[0];

    if (!primary) {
      return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=no_calendars`);
    }

    await supabaseAdmin.from('co_calendar_connections').upsert(
      {
        commissioner_id: commissionerId,
        provider: 'google',
        calendar_id: primary.id,
        display_name: primary.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.token_expires_at,
        sync_enabled: true,
        push_bookings: true,
        pull_busy_times: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'commissioner_id,provider,calendar_id' }
    );

    return NextResponse.redirect(`${siteUrl}/vendor/calendar?connected=google`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${siteUrl}/vendor/calendar?error=google_auth_failed`);
  }
}
