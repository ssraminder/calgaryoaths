import type { OrderItem } from './types';

export const GST_RATE = 0.05;

export function lineTotalCents(item: Pick<OrderItem, 'quantity' | 'unit_price_cents' | 'gov_fee_cents'>): number {
  const unit = item.unit_price_cents || 0;
  const gov = item.gov_fee_cents || 0;
  return (item.quantity || 0) * (unit + gov);
}

export function computeTotals(opts: {
  items: Array<Pick<OrderItem, 'quantity' | 'unit_price_cents' | 'gov_fee_cents'>>;
  travelFeeCents?: number | null;
  discountCents?: number | null;
  taxRate?: number;
}) {
  const taxRate = opts.taxRate ?? GST_RATE;
  const itemsSubtotal = opts.items.reduce((sum, item) => sum + lineTotalCents(item), 0);
  const travel = opts.travelFeeCents || 0;
  const discount = opts.discountCents || 0;
  const subtotalCents = Math.max(0, itemsSubtotal + travel - discount);
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}
