import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { recordOrderEmail, normalizeMessageId } from '@/lib/orders/email-log';

interface OrderForNotice {
  id: string;
  order_number: string;
  order_type: string;
  customer_name: string | null;
  customer_email: string | null;
  performed_by_commissioner_id: string | null;
  signature_url: string | null;
  terms_accepted_at: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
}

interface SendNoticeResult {
  customerSent: boolean;
  partnerSent: boolean;
  partnerEmail: string | null;
}

function serviceLabel(orderType: string): string {
  return orderType === 'apostille' ? 'apostille / authentication' : 'notarization / oath commissioner';
}

function customerBody(order: OrderForNotice): string {
  const name = order.customer_name || 'there';
  const reason = order.cancelled_reason ? `<p><strong>Reason recorded:</strong> ${order.cancelled_reason}</p>` : '';
  const signedOn = order.signed_at ? new Date(order.signed_at).toLocaleString() : '—';
  const cancelledOn = order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : new Date().toLocaleString();
  return `
    <p>Hi ${name},</p>
    <p>This email confirms that Calgary Oaths order <strong>${order.order_number}</strong> (${serviceLabel(order.order_type)}) has been cancelled.</p>
    <p><strong>The terms and conditions you signed on ${signedOn} for this order are now null and void.</strong> No further service will be performed under that signed agreement, and no charges will be processed unless previously paid.</p>
    ${reason}
    <p>Cancelled on: ${cancelledOn}</p>
    <p>If this cancellation was made in error, or if you have any questions, please reply to this email and we'll be in touch.</p>
    <p>- Calgary Oaths<br/>(587) 600-0746 . info@calgaryoaths.com</p>
  `;
}

function partnerBody(order: OrderForNotice, partnerName: string | null): string {
  const greet = partnerName ? `Hi ${partnerName},` : 'Hello,';
  const reason = order.cancelled_reason ? `<p><strong>Reason:</strong> ${order.cancelled_reason}</p>` : '';
  const customer = order.customer_name || 'the customer';
  const signedOn = order.signed_at ? new Date(order.signed_at).toLocaleString() : '—';
  const cancelledOn = order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : new Date().toLocaleString();
  return `
    <p>${greet}</p>
    <p>Order <strong>${order.order_number}</strong> (${serviceLabel(order.order_type)}) for ${customer} has been cancelled.</p>
    <p>The terms & conditions signed by the customer on ${signedOn} are <strong>null and void</strong>. Please do not proceed with the service.</p>
    ${reason}
    <p>Cancelled on: ${cancelledOn}</p>
    <p>The customer has been notified by email.</p>
    <p>- Calgary Oaths Admin<br/>(587) 600-0746 . info@calgaryoaths.com</p>
  `;
}

/**
 * Sends cancellation notices to the customer and (when applicable) the assigned
 * partner / commissioner, informing them that the signed terms are now null
 * and void. Only call this when a previously-signed order has been cancelled.
 */
export async function sendCancellationNotices(order: OrderForNotice): Promise<SendNoticeResult> {
  const result: SendNoticeResult = { customerSent: false, partnerSent: false, partnerEmail: null };

  const subject = `Cancelled - Calgary Oaths order ${order.order_number}`;

  // Customer notice
  if (order.customer_email) {
    try {
      const resp = await sendEmail({
        to: order.customer_email,
        subject,
        html: customerBody(order),
        replyTo: 'info@calgaryoaths.com',
      });
      await recordOrderEmail({
        orderId: order.id,
        messageId: normalizeMessageId(resp?.messageId),
        recipient: order.customer_email,
        subject,
        kind: 'cancellation_customer',
      });
      result.customerSent = true;
    } catch (err) {
      console.error('Cancellation customer email failed', err);
    }
  }

  // Partner notice (notarization orders with an assigned commissioner)
  if (order.performed_by_commissioner_id) {
    try {
      const { data: commissioner } = await supabaseAdmin
        .from('co_commissioners')
        .select('name, email')
        .eq('id', order.performed_by_commissioner_id)
        .single();
      if (commissioner?.email) {
        result.partnerEmail = commissioner.email;
        const partnerSubject = `${subject} (assigned to you)`;
        const resp = await sendEmail({
          to: commissioner.email,
          subject: partnerSubject,
          html: partnerBody(order, commissioner.name || null),
          replyTo: 'info@calgaryoaths.com',
        });
        await recordOrderEmail({
          orderId: order.id,
          messageId: normalizeMessageId(resp?.messageId),
          recipient: commissioner.email,
          subject: partnerSubject,
          kind: 'cancellation_partner',
        });
        result.partnerSent = true;
      }
    } catch (err) {
      console.error('Cancellation partner email failed', err);
    }
  }

  return result;
}
