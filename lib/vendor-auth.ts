import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-server';

/** Verify the request comes from an authenticated vendor. Returns user + commissioner or null. */
export async function verifyVendor(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from('co_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vendor') return null;

  // Find the commissioner record linked to this user
  const { data: commissioner } = await supabaseAdmin
    .from('co_commissioners')
    .select('id, name')
    .eq('user_id', user.id)
    .single();

  if (!commissioner) return null;

  return { ...user, commissionerId: commissioner.id, commissionerName: commissioner.name };
}
