import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateHandoff } from '@/lib/orders/handoff-token';
import { customerSubmitSchema } from '@/lib/orders/schema';
import { buildSignedTermsPdf } from '@/lib/orders/signed-terms-pdf';
import { sendEmail } from '@/lib/email';

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
    .select('id, order_number, handoff_token, handoff_token_expires_at, handoff_used_at, order_type, order_date')
    .eq('handoff_token', token)
    .single();

  if (findErr || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const validity = validateHandoff(order);
  if (!validity.valid) return NextResponse.json({ error: validity.reason }, { status: 410 });

  const { data: terms } = await supabaseAdmin
    .from('co_terms_versions')
    .select('id, form_type, version, content_md')
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

  // Generate signed-terms PDF, store it, and email it to the customer.
  // Failures here must NOT fail the submission — log and continue.
  try {
    const pdfBytes = await buildSignedTermsPdf({
      order: {
        order_number: order.order_number,
        order_type: order.order_type,
        order_date: order.order_date,
        customer_name: customerFields.customer_name,
        customer_email: customerFields.customer_email,
        customer_phone: customerFields.customer_phone,
        customer_address_unit: customerFields.customer_address_unit ?? null,
        customer_address_street: customerFields.customer_address_street,
        customer_address_city: customerFields.customer_address_city,
        customer_address_province: customerFields.customer_address_province,
        customer_address_postal: customerFields.customer_address_postal,
        customer_address_country: customerFields.customer_address_country,
        terms_accepted_at: now,
        signed_at: now,
        signed_ip: ip,
        signed_user_agent: ua,
      },
      terms: { version: terms.version, content_md: terms.content_md },
      signature: { buffer: sig.buffer, contentType: sig.contentType },
    });

    const pdfBuffer = Buffer.from(pdfBytes);
    const pdfPath = `signed-terms/${order.id}/${Date.now()}.pdf`;
    await supabaseAdmin.storage
      .from(SIGNATURES_BUCKET)
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: false })
      .catch((err) => console.error('Signed terms PDF storage upload failed', err));

    const filename = `signed-terms-${order.order_number}.pdf`;
    const serviceLabel = order.order_type === 'apostille' ? 'apostille / authentication' : 'notarization / oath commissioner';
    await sendEmail({
      to: customerFields.customer_email,
      subject: `Your signed terms & conditions - Calgary Oaths order ${order.order_number}`,
      html: `
        <p>Hi ${customerFields.customer_name || 'there'},</p>
        <p>Thank you for completing your ${serviceLabel} order with Calgary Oaths.</p>
        <p>A copy of the terms and conditions you accepted (version ${terms.version}), along with your signature, is attached to this email for your records.</p>
        <p>Order #: <strong>${order.order_number}</strong><br/>Signed on: ${new Date(now).toLocaleString()}</p>
        <p>If you have any questions, just reply to this email.</p>
        <p>- Calgary Oaths<br/>(587) 600-0746 . info@calgaryoaths.com</p>
      `,
      replyTo: 'info@calgaryoaths.com',
      attachments: [{ name: filename, content: pdfBuffer }],
    });
  } catch (err) {
    console.error('Signed terms email failed', err);
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
