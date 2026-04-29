import type { OrderItem } from './types';

export interface TaxRateRow {
  province_code: string;
  province_name: string;
  gst_rate: number | string;
  pst_rate: number | string;
  hst_rate: number | string;
  total_rate: number | string;
}

export interface TaxBreakdown {
  province_code: string;
  province_name: string;
  gst_rate: number;
  pst_rate: number;
  hst_rate: number;
  total_rate: number;
  gst_cents: number;
  pst_cents: number;
  hst_cents: number;
  total_cents: number;
  /** Human-readable summary of the rate makeup, e.g. "GST 5% + PST 7%" or "HST 13%" */
  label: string;
}

const DEFAULT_FALLBACK: TaxRateRow = {
  province_code: 'AB',
  province_name: 'Alberta',
  gst_rate: 0.05,
  pst_rate: 0,
  hst_rate: 0,
  total_rate: 0.05,
};

function asNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function pctLabel(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(3).replace(/\.?0+$/, '')}%`;
}

export function buildTaxLabel(row: { gst_rate: number; pst_rate: number; hst_rate: number; total_rate: number }): string {
  const parts: string[] = [];
  if (row.hst_rate > 0) parts.push(`HST ${pctLabel(row.hst_rate)}`);
  if (row.gst_rate > 0) parts.push(`GST ${pctLabel(row.gst_rate)}`);
  if (row.pst_rate > 0) parts.push(`PST ${pctLabel(row.pst_rate)}`);
  if (parts.length === 0) return 'No tax';
  return parts.join(' + ');
}

export function lineTotalCents(item: Pick<OrderItem, 'quantity' | 'unit_price_cents' | 'gov_fee_cents'>): number {
  const unit = item.unit_price_cents || 0;
  const gov = item.gov_fee_cents || 0;
  return (item.quantity || 0) * (unit + gov);
}

export function computeTaxBreakdown(
  taxableCents: number,
  rate: TaxRateRow | null | undefined,
): TaxBreakdown {
  const r = rate || DEFAULT_FALLBACK;
  const gst = asNumber(r.gst_rate);
  const pst = asNumber(r.pst_rate);
  const hst = asNumber(r.hst_rate);
  const total = asNumber(r.total_rate) || gst + pst + hst;
  const gst_cents = Math.round(taxableCents * gst);
  const pst_cents = Math.round(taxableCents * pst);
  const hst_cents = Math.round(taxableCents * hst);
  const total_cents = gst_cents + pst_cents + hst_cents;
  return {
    province_code: r.province_code,
    province_name: r.province_name,
    gst_rate: gst,
    pst_rate: pst,
    hst_rate: hst,
    total_rate: total,
    gst_cents,
    pst_cents,
    hst_cents,
    total_cents,
    label: buildTaxLabel({ gst_rate: gst, pst_rate: pst, hst_rate: hst, total_rate: total }),
  };
}

export function computeTotals(opts: {
  items: Array<Pick<OrderItem, 'quantity' | 'unit_price_cents' | 'gov_fee_cents'>>;
  travelFeeCents?: number | null;
  discountCents?: number | null;
  taxRate?: TaxRateRow | null;
}) {
  const itemsSubtotal = opts.items.reduce((sum, item) => sum + lineTotalCents(item), 0);
  const travel = opts.travelFeeCents || 0;
  const discount = opts.discountCents || 0;
  const subtotalCents = Math.max(0, itemsSubtotal + travel - discount);
  const tax = computeTaxBreakdown(subtotalCents, opts.taxRate || null);
  return {
    subtotalCents,
    taxCents: tax.total_cents,
    totalCents: subtotalCents + tax.total_cents,
    tax,
  };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}
