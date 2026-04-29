import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-server';

const STAFF_ROLES = ['owner', 'admin', 'vendor'] as const;
const STAFF_READ_ROLES = ['owner', 'admin', 'viewer', 'vendor'] as const;

type StaffMode = 'read' | 'write';

export async function verifyStaff(req: NextRequest, mode: StaffMode = 'write') {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from('co_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  const roles = mode === 'read' ? STAFF_READ_ROLES : STAFF_ROLES;
  if (!(roles as readonly string[]).includes(profile.role)) return null;

  return { id: user.id, email: profile.email, fullName: profile.full_name, role: profile.role };
}
