import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const serviceSlug = new URL(req.url).searchParams.get('serviceSlug');

  if (!serviceSlug) {
    return NextResponse.json({ error: 'Missing serviceSlug' }, { status: 400 });
  }

  // Get commissioner IDs that offer this service
  const { data: links, error: linkError } = await supabase
    .from('co_commissioner_services')
    .select('commissioner_id')
    .eq('service_slug', serviceSlug);

  if (linkError) {
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }

  const ids = (links ?? []).map((l) => l.commissioner_id);
  if (ids.length === 0) {
    return NextResponse.json({ commissioners: [] });
  }

  const { data: commissioners, error: comError } = await supabase
    .from('co_commissioners')
    .select('id, name, location')
    .in('id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (comError) {
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }

  return NextResponse.json({ commissioners: commissioners ?? [] });
}
