import { supabaseAdmin } from '@/lib/supabase-server';

export type OrderEmailKind =
  | 'signed_terms_on_submit'
  | 'invoice_terms'
  | 'cancellation_customer'
  | 'cancellation_partner'
  | 'other';

interface RecordArgs {
  orderId: string;
  messageId?: string | null;
  recipient: string;
  subject: string;
  kind: OrderEmailKind;
  attachmentNames?: string[];
  triggeredBy?: { id: string; fullName?: string | null; email?: string | null } | null;
}

export async function recordOrderEmail(args: RecordArgs): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('co_order_emails').insert({
      order_id: args.orderId,
      message_id: args.messageId || null,
      recipient: args.recipient,
      subject: args.subject,
      kind: args.kind,
      attachments_json: args.attachmentNames ?? null,
      triggered_by: args.triggeredBy?.id ?? null,
      triggered_by_name: args.triggeredBy?.fullName || args.triggeredBy?.email || null,
    });
    if (error) console.error('recordOrderEmail insert error', error);
  } catch (err) {
    console.error('recordOrderEmail threw', err);
  }
}

/**
 * Extracts the bare message id between angle brackets if present, otherwise
 * returns the raw value. Brevo returns ids like "<201906250845...@smtp...>"
 * and the events endpoint accepts either form.
 */
export function normalizeMessageId(raw?: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^<(.+)>$/);
  return m ? m[1] : raw;
}
