import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bookingServices } from '@/lib/data/booking';
import { sendEmail } from '@/lib/email';
import { commissioners } from '@/lib/data/commissioners';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceSlug, commissionerId, name, email, phone, notes, numDocuments } = body;

    const service = bookingServices.find((s) => s.slug === serviceSlug);
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    const { data: booking, error: dbError } = await supabase
      .from('co_bookings')
      .insert({
        service_slug: serviceSlug,
        service_name: service.name,
        commissioner_id: commissionerId || null,
        name,
        email,
        phone,
        notes: notes || null,
        num_documents: numDocuments || 1,
        requires_review: service.requiresReview,
        status: service.requiresReview ? 'pending_review' : 'pending_scheduling',
      })
      .select('id')
      .single();

    if (dbError || !booking) {
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
    }

    // Manual-review: notify team, return without Calendly/Stripe
    if (service.requiresReview) {
      await sendEmail({
        to: 'info@calgaryoaths.com',
        replyTo: email,
        subject: `New booking request (manual review) — ${service.name}`,
        html: `
          <h2>New Booking Request — Manual Review Required</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #ddd">${service.name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Preferred commissioner</td><td style="padding:8px;border:1px solid #ddd">${commissionerId || 'No preference'}</td></tr>
            ${notes ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Notes</td><td style="padding:8px;border:1px solid #ddd">${notes}</td></tr>` : ''}
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Booking ID</td><td style="padding:8px;border:1px solid #ddd">${booking.id}</td></tr>
          </table>
          <p style="margin-top:16px;color:#666">Reply to this email to contact the client directly.</p>
        `,
      }).catch((err) => console.error('Manual review email error:', err));

      return NextResponse.json({ bookingId: booking.id, requiresReview: true });
    }

    // Auto-confirm: return booking id + the right Calendly URL for the chosen commissioner
    const commissioner = commissioners.find((c) => c.id === commissionerId) ?? commissioners[0];
    return NextResponse.json({
      bookingId: booking.id,
      requiresReview: false,
      calendlyUrl: commissioner.calendlyUrl,
    });
  } catch (err) {
    console.error('Booking create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
