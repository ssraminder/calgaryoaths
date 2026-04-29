import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { idPhotoSchema } from '@/lib/orders/schema';

const BUCKET = 'orders';

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req, 'read');
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;
  const { data, error } = await supabaseAdmin
    .from('co_order_id_photos')
    .select('*')
    .eq('order_id', id)
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: data || [] });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = idPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = ctx.params;
  const img = dataUrlToBuffer(parsed.data.photo_data_url);
  if (!img) return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
  const ext = img.contentType.split('/')[1] === 'jpeg' ? 'jpg' : img.contentType.split('/')[1];
  const path = `id-photos/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, img.buffer, { contentType: img.contentType, upsert: false });
  if (upErr) {
    console.error('ID photo upload error', upErr);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  const { data: maxRow } = await supabaseAdmin
    .from('co_order_id_photos')
    .select('position')
    .eq('order_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .single();
  const position = (maxRow?.position ?? -1) + 1;

  const { data: photo, error: insErr } = await supabaseAdmin
    .from('co_order_id_photos')
    .insert({
      order_id: id,
      label: parsed.data.label || '',
      photo_url: pub.publicUrl,
      position,
      uploaded_by: staff.id,
    })
    .select('*')
    .single();

  if (insErr) {
    console.error('ID photo insert error', insErr);
    return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 });
  }

  return NextResponse.json({ photo });
}
