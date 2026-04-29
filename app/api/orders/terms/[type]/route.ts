import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, ctx: { params: { type: string } }) {
  const { type } = ctx.params;
  if (!['apostille', 'notarization', 'general'].includes(type)) {
    return NextResponse.json({ error: 'Invalid form type' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('co_terms_versions')
    .select('id, form_type, version, content_md, effective_from')
    .eq('form_type', type)
    .lte('effective_from', new Date().toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ error: 'No active terms' }, { status: 404 });
  return NextResponse.json({ terms: data });
}
