// Public booking summary for the post-payment confirmation page.
// Looked up by the booking's UUID (unguessable, carried in the success redirect) and
// returns only what the customer needs to find their appointment — no contact details,
// no customer address, no payment data.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { withBookingLocations } from '@/lib/booking-location';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabaseAdmin
    .from('co_bookings')
    .select('id, service_name, appointment_datetime, status, delivery_mode, location_id, commissioner_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [booking] = await withBookingLocations([data]);
  const { data: commissioner } = data.commissioner_id
    ? await supabaseAdmin.from('co_commissioners').select('name').eq('id', data.commissioner_id).maybeSingle()
    : { data: null };

  return NextResponse.json({
    serviceName: booking.service_name,
    appointmentDatetime: booking.appointment_datetime,
    status: booking.status,
    deliveryMode: booking.delivery_mode,
    locationName: booking.location_name,
    locationAddress: booking.location_address,
    commissionerName: (commissioner as { name: string | null } | null)?.name ?? null,
  });
}
