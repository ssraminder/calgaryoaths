// Calendar connect API — returns OAuth URL for Google/Microsoft or saves Apple CalDAV credentials.
import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { googleAuthUrl, microsoftAuthUrl, appleListCalendars } from '@/lib/calendar-providers';

export async function POST(req: NextRequest) {
  const vendor = await verifyVendor(req);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider } = body as { provider: string };

  if (provider === 'google') {
    return NextResponse.json({ url: googleAuthUrl(vendor.commissionerId) });
  }

  if (provider === 'microsoft') {
    return NextResponse.json({ url: microsoftAuthUrl(vendor.commissionerId) });
  }

  if (provider === 'apple') {
    const { username, appPassword, serverUrl } = body as {
      username: string;
      appPassword: string;
      serverUrl?: string;
    };

    if (!username || !appPassword) {
      return NextResponse.json({ error: 'Apple ID and app-specific password are required' }, { status: 400 });
    }

    try {
      const calendars = await appleListCalendars(username, appPassword, serverUrl);
      if (calendars.length === 0) {
        return NextResponse.json({ error: 'No calendars found. Check your credentials.' }, { status: 400 });
      }

      const primary = calendars[0];
      await supabaseAdmin.from('co_calendar_connections').upsert(
        {
          commissioner_id: vendor.commissionerId,
          provider: 'apple',
          calendar_id: primary.id,
          display_name: primary.name,
          access_token: username,        // store Apple ID as access_token
          refresh_token: appPassword,    // store app password as refresh_token
          caldav_url: serverUrl || 'https://caldav.icloud.com',
          sync_enabled: true,
          push_bookings: true,
          pull_busy_times: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'commissioner_id,provider,calendar_id' }
      );

      return NextResponse.json({ connected: true, calendarName: primary.name });
    } catch (err) {
      console.error('Apple CalDAV connect error:', err);
      return NextResponse.json(
        { error: 'Could not connect to Apple Calendar. Check your Apple ID and app-specific password.' },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
}
