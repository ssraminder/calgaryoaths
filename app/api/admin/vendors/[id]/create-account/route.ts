import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { email, password, full_name } = body as { email: string; password: string; full_name: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  // Check commissioner exists and doesn't already have an account
  const { data: commissioner, error: comErr } = await supabaseAdmin
    .from('co_commissioners')
    .select('id, name, user_id')
    .eq('id', id)
    .single();

  if (comErr || !commissioner) {
    return NextResponse.json({ error: 'Commissioner not found' }, { status: 404 });
  }

  if (commissioner.user_id) {
    return NextResponse.json({ error: 'This commissioner already has an account' }, { status: 400 });
  }

  // Create Supabase Auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message || 'Failed to create user' }, { status: 500 });
  }

  const userId = authData.user.id;

  // Create profile with vendor role
  await supabaseAdmin.from('co_profiles').insert({
    id: userId,
    email,
    full_name: full_name || commissioner.name,
    role: 'vendor',
  });

  // Link to commissioner
  await supabaseAdmin
    .from('co_commissioners')
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true, userId });
}
