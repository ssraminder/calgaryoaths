import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams;
  const statuses = url.get('status')?.split(',').filter(Boolean) || [];
  const commissioner = url.get('commissioner') || '';
  const dateFrom = url.get('dateFrom') || '';
  const dateTo = url.get('dateTo') || '';

  let query = supabaseAdmin
    .from('co_bookings')
    .select('id, name, email, phone, service_name, commissioner_id, appointment_datetime, status, amount_paid, created_at, notes, num_documents');

  if (statuses.length > 0) query = query.in('status', statuses);
  if (commissioner) query = query.eq('commissioner_id', commissioner);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z');

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const header = 'ID,Name,Email,Phone,Service,Commissioner,Appointment,Status,Amount Paid,Created';
  const csvRows = rows.map((r) =>
    [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.email,
      r.phone || '',
      `"${(r.service_name || '').replace(/"/g, '""')}"`,
      r.commissioner_id,
      r.appointment_datetime || '',
      r.status,
      r.amount_paid != null ? (r.amount_paid / 100).toFixed(2) : '',
      r.created_at,
    ].join(',')
  );

  const csv = [header, ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
