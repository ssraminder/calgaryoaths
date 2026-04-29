import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { z } from 'zod';

const BUCKET = 'orders';
const patchSchema = z.object({ label: z.string().max(120) });

export async function PATCH(req: NextRequest, ctx: { params: { id: string; photoId: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('co_order_id_photos')
    .update({ label: parsed.data.label })
    .eq('id', ctx.params.photoId)
    .eq('order_id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string; photoId: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: photo } = await supabaseAdmin
    .from('co_order_id_photos')
    .select('photo_url')
    .eq('id', ctx.params.photoId)
    .eq('order_id', ctx.params.id)
    .single();

  if (photo?.photo_url) {
    try {
      const url = new URL(photo.photo_url);
      const idx = url.pathname.indexOf(`/${BUCKET}/`);
      if (idx >= 0) {
        const path = url.pathname.slice(idx + BUCKET.length + 2);
        await supabaseAdmin.storage.from(BUCKET).remove([decodeURIComponent(path)]);
      }
    } catch {
      // ignore storage cleanup failure
    }
  }

  const { error } = await supabaseAdmin
    .from('co_order_id_photos')
    .delete()
    .eq('id', ctx.params.photoId)
    .eq('order_id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
