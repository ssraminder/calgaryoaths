import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: booking, error } = await supabaseAdmin
    .from('co_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin.from('co_bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', id);

  const apptDate = booking.appointment_datetime
    ? new Date(booking.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' })
    : '';

  try {
    await sendEmail({
      to: booking.email,
      subject: `Booking confirmed — ${booking.service_name}`,
      html: `<h2>Your Booking is Confirmed!</h2><p>Hi ${booking.name},</p><p>Your appointment for <strong>${booking.service_name}</strong> on <strong>${apptDate}</strong> has been confirmed.</p><p>Thank you,<br/>Calgary Oaths</p>`,
    });
  } catch (e) { console.error('Accept email error:', e); }

  return NextResponse.json({ success: true });
}
