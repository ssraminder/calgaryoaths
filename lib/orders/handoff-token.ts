import crypto from 'crypto';

export const HANDOFF_TTL_MINUTES = 60;

export function generateHandoffToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function handoffExpiry(now = new Date()): Date {
  return new Date(now.getTime() + HANDOFF_TTL_MINUTES * 60 * 1000);
}

export interface HandoffValidity {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'used';
}

export function validateHandoff(order: {
  handoff_token: string | null;
  handoff_token_expires_at: string | null;
  handoff_used_at: string | null;
}): HandoffValidity {
  if (!order.handoff_token) return { valid: false, reason: 'not_found' };
  if (order.handoff_used_at) return { valid: false, reason: 'used' };
  if (!order.handoff_token_expires_at) return { valid: false, reason: 'expired' };
  if (new Date(order.handoff_token_expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true };
}
