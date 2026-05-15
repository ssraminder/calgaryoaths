import { supabaseAdmin } from '@/lib/supabase-server';

export interface AuditActor {
  id: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
}

export interface OrderEventInsert {
  orderId: string;
  actor: AuditActor;
  eventType: string;
  summary: string;
  changes?: Record<string, unknown> | null;
}

export async function logOrderEvent(evt: OrderEventInsert): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('co_order_events').insert({
      order_id: evt.orderId,
      actor_id: evt.actor.id,
      actor_name: evt.actor.fullName || evt.actor.email || null,
      actor_role: evt.actor.role || null,
      event_type: evt.eventType,
      summary: evt.summary,
      changes_json: evt.changes ?? null,
    });
    if (error) console.error('logOrderEvent insert error', error);
  } catch (err) {
    console.error('logOrderEvent threw', err);
  }
}

/**
 * Compare a "before" snapshot against the patch payload and return only the
 * fields that actually changed, formatted as { from, to } pairs.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  allowed: string[],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of allowed) {
    if (!(key in after)) continue;
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[key] = { from: a, to: b };
    }
  }
  return out;
}
