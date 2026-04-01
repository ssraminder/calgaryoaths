import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — use only in admin API routes and server components.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options = {}) =>
      fetch(url as RequestInfo, { ...(options as RequestInit), cache: 'no-store' }),
  },
});
