import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('co_commissioners')
    .select('*, co_commissioner_services(service_slug)')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { services, ...commissioner } = body as Record<string, unknown> & { services?: string[] };

  const { data, error } = await supabaseAdmin
    .from('co_commissioners')
    .insert(commissioner)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert service associations
  if (services?.length && data) {
    await supabaseAdmin.from('co_commissioner_services').insert(
      services.map((slug: string) => ({ commissioner_id: data.id, service_slug: slug }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}
