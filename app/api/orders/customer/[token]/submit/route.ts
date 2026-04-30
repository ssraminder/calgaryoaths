import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateHandoff } from '@/lib/orders/handoff-token';
import { customerSubmitSchema } from '@/lib/orders/schema';

const SIGNATURES_BUCKET = 'orders';

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  const { token } = ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = customerSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { signature_data_url, signature_name, terms_version_id, ...customerFields } = parsed.data;

  const { data: order, error: findErr } = await supabaseAdmin
    .from('co_orders')
    .select('id, handoff_token, handoff_token_expires_at, handoff_used_at, order_type')
    .eq('handoff_token', token)
    .single();

  if (findErr || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const validity = validateHandoff(order);
  if (!validity.valid) return NextResponse.json({ error: validity.reason }, { status: 410 });

  const { data: terms } = await supabaseAdmin
    .from('co_terms_versions')
    .select('id, form_type')
    .eq('id', terms_version_id)
    .single();
  if (!terms || terms.form_type !== order.order_type) {
    return NextResponse.json({ error: 'Invalid terms version' }, { status: 400 });
  }

  const sig = dataUrlToBuffer(signature_data_url);
  if (!sig) return NextResponse.json({ error: 'Invalid signature image' }, { status: 400 });

  const ext = sig.contentType.split('/')[1] === 'svg+xml' ? 'svg' : sig.contentType.split('/')[1];
  const path = `signatures/${order.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(SIGNATURES_BUCKET)
    .upload(path, sig.buffer, { contentType: sig.contentType, upsert: false });
  if (upErr) {
    console.error('Signature upload error', upErr);
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
  }
  const { data: pub } = supabaseAdmin.storage.from(SIGNATURES_BUCKET).getPublicUrl(path);
  const signature_url = pub.publicUrl;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ua = req.headers.get('user-agent') || null;
  const now = new Date().toISOString();

  const { error: updErr } = await supabaseAdmin
    .from('co_orders')
    .update({
      ...customerFields,
      terms_version_id,
      terms_accepted_at: now,
      signature_url,
      signed_name: signature_name,
      signed_at: now,
      signed_ip: ip,
      signed_user_agent: ua,
      handoff_used_at: now,
      status: 'customer_completed',
    })
    .eq('id', order.id);

  if (updErr) {
    console.error('Customer submit update error', updErr);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
