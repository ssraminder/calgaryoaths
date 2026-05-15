import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyStaff } from '@/lib/orders/auth';
import { buildInvoicePdf } from '@/lib/orders/invoice-pdf';
import { buildSignedTermsPdf } from '@/lib/orders/signed-terms-pdf';
import { sendEmail } from '@/lib/email';
import type { TaxRateRow } from '@/lib/orders/pricing';

const ORDERS_BUCKET = 'orders';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const staff = await verifyStaff(req);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = ctx.params;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('co_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!order.customer_email) {
    return NextResponse.json({ error: 'Order has no customer email on file' }, { status: 400 });
  }

  const { data: items } = await supabaseAdmin
    .from('co_order_items')
    .select('*')
    .eq('order_id', id)
    .order('position', { ascending: true });

  // Tax rate for invoice tax breakdown
  let taxRate: TaxRateRow | null = null;
  if (order.tax_province_code) {
    const { data: rate } = await supabaseAdmin
      .from('co_tax_rates')
      .select('province_code, province_name, gst_rate, pst_rate, hst_rate, total_rate')
      .eq('province_code', order.tax_province_code)
      .maybeSingle();
    if (rate) taxRate = rate as TaxRateRow;
  }

  // Generate invoice PDF
  let invoicePdfBytes: Uint8Array | null = null;
  try {
    invoicePdfBytes = await buildInvoicePdf({ order, items: items || [], taxRate });
  } catch (err) {
    console.error('Invoice PDF generation failed', err);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }

  // Generate signed-terms PDF if we have a signature + terms version
  let termsPdfBytes: Uint8Array | null = null;
  if (order.terms_version_id && order.signature_url) {
    try {
      const { data: terms } = await supabaseAdmin
        .from('co_terms_versions')
        .select('version, content_md')
        .eq('id', order.terms_version_id)
        .single();
      if (terms) {
        const sigRes = await fetch(order.signature_url);
        if (sigRes.ok) {
          const sigContentType = sigRes.headers.get('content-type') || 'image/png';
          const sigBuffer = Buffer.from(await sigRes.arrayBuffer());
          termsPdfBytes = await buildSignedTermsPdf({
            order: {
              order_number: order.order_number,
              order_type: order.order_type,
              order_date: order.order_date,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              customer_address_unit: order.customer_address_unit,
              customer_address_street: order.customer_address_street,
              customer_address_city: order.customer_address_city,
              customer_address_province: order.customer_address_province,
              customer_address_postal: order.customer_address_postal,
              customer_address_country: order.customer_address_country,
              terms_accepted_at: order.terms_accepted_at,
              signed_at: order.signed_at,
              signed_ip: order.signed_ip,
              signed_user_agent: order.signed_user_agent,
            },
            terms: { version: terms.version, content_md: terms.content_md },
            signature: { buffer: sigBuffer, contentType: sigContentType },
          });
        }
      }
    } catch (err) {
      console.error('Signed terms PDF generation failed', err);
      // Continue without terms attachment — invoice should still go out.
    }
  }

  const invoiceFilename = `invoice-${order.invoice_number || order.order_number}.pdf`;
  const termsFilename = `signed-terms-${order.order_number}.pdf`;
  const attachments = [{ name: invoiceFilename, content: Buffer.from(invoicePdfBytes) }];
  if (termsPdfBytes) attachments.push({ name: termsFilename, content: Buffer.from(termsPdfBytes) });

  // Archive the invoice copy to storage (best-effort)
  await supabaseAdmin.storage
    .from(ORDERS_BUCKET)
    .upload(`invoices/${order.id}/${Date.now()}.pdf`, Buffer.from(invoicePdfBytes), {
      contentType: 'application/pdf',
      upsert: false,
    })
    .catch((err) => console.error('Invoice storage upload failed', err));

  const serviceLabel = order.order_type === 'apostille' ? 'apostille / authentication' : 'notarization / oath commissioner';
  const greetingName = order.customer_name || 'there';

  try {
    await sendEmail({
      to: order.customer_email,
      subject: `Your Calgary Oaths invoice ${order.invoice_number || order.order_number}`,
      replyTo: 'info@calgaryoaths.com',
      html: `
        <p>Hi ${greetingName},</p>
        <p>Thank you for your ${serviceLabel} order with Calgary Oaths. Your invoice is attached for your records${termsPdfBytes ? ', along with a copy of the terms and conditions you accepted' : ''}.</p>
        <p>Order #: <strong>${order.order_number}</strong><br/>
        Invoice #: <strong>${order.invoice_number || order.order_number}</strong></p>
        <p>If you have any questions, just reply to this email.</p>
        <p>- Calgary Oaths<br/>(587) 600-0746 . info@calgaryoaths.com</p>
      `,
      attachments,
    });
  } catch (err) {
    console.error('Customer email send failed', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sent_to: order.customer_email,
    attachments: attachments.map((a) => a.name),
  });
}
