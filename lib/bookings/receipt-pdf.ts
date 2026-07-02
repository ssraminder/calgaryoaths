import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatCents } from '@/lib/orders/pricing';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;

/** Fields the receipt needs off a co_bookings row. Extra columns are ignored. */
export interface ReceiptBooking {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service_name: string | null;
  num_documents: number | null;
  delivery_mode: string | null;
  customer_address: string | null;
  appointment_datetime: string | null;
  created_at: string;
  status: string;
  amount_paid: number | null;
  total_charged_cents: number | null;
  convenience_fee_cents: number | null;
  travel_fee_cents: number | null;
  tax_cents: number | null;
  tax_rate: number | string | null;
  stripe_payment_intent_id: string | null;
}

export interface ReceiptCommissioner {
  name: string | null;
  address: string | null;
  gst_number: string | null;
}

/** Build the human-readable receipt number from a booking id. Stable across regenerations. */
export function receiptNumber(bookingId: string): string {
  return `RCPT-${bookingId.slice(0, 8).toUpperCase()}`;
}

function sanitize(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•]/g, '*')
    .replace(/[ ]/g, ' ')
    .replace(/[…]/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

function wrapText(text: string, font: { widthOfTextAtSize: (s: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Derive the customer-facing money breakdown. Prefers the stored breakdown columns
 * (which mirror the Stripe line items exactly); falls back to backing GST out of the
 * paid total for older/flat-fee bookings that predate the breakdown columns.
 * Internal platform/vendor/commission figures are never referenced here.
 */
function computeBreakdown(booking: ReceiptBooking) {
  const total = booking.amount_paid ?? booking.total_charged_cents ?? 0;
  const rate = (() => {
    const r = typeof booking.tax_rate === 'string' ? parseFloat(booking.tax_rate) : booking.tax_rate;
    return r && Number.isFinite(r) && r > 0 ? r : 0.05;
  })();

  if (booking.tax_cents != null && booking.total_charged_cents != null) {
    const taxCents = booking.tax_cents;
    const travelFee = booking.travel_fee_cents || 0;
    const convenienceFee = booking.convenience_fee_cents || 0;
    const serviceFee = booking.total_charged_cents - taxCents - travelFee - convenienceFee;
    return { serviceFee, travelFee, convenienceFee, taxCents, rate, total };
  }

  // Fallback: business is GST-registered and prices are tax-inclusive.
  const subtotal = Math.round(total / (1 + rate));
  return {
    serviceFee: subtotal,
    travelFee: 0,
    convenienceFee: 0,
    taxCents: total - subtotal,
    rate,
    total,
  };
}

export async function buildBookingReceiptPdf(
  booking: ReceiptBooking,
  commissioner: ReceiptCommissioner | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;
  const writableWidth = PAGE_WIDTH - MARGIN_X * 2;

  function drawText(text: string, x: number, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb> } = {}) {
    const size = opts.size ?? 10;
    const useFont = opts.font ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    page.drawText(sanitize(text), { x, y: y - size, size, font: useFont, color });
  }

  function nextLine(size: number, gap = 4) { y -= size + gap; }

  function drawParagraph(text: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; spaceAfter?: number; maxWidth?: number; x?: number } = {}) {
    const size = opts.size ?? 10;
    const useFont = opts.font ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    const lineHeight = size * 1.4;
    const maxW = opts.maxWidth ?? writableWidth;
    const xPos = opts.x ?? MARGIN_X;
    for (const line of wrapText(sanitize(text), useFont, size, maxW)) {
      page.drawText(line, { x: xPos, y: y - size, size, font: useFont, color });
      y -= lineHeight;
    }
    y -= opts.spaceAfter ?? 4;
  }

  function drawDivider(color = rgb(0.75, 0.75, 0.75), thickness = 0.5) {
    page.drawLine({ start: { x: MARGIN_X, y: y - 2 }, end: { x: PAGE_WIDTH - MARGIN_X, y: y - 2 }, thickness, color });
    y -= 10;
  }

  const b = computeBreakdown(booking);
  const subtotal = b.serviceFee + b.travelFee + b.convenienceFee;
  const isMobile = booking.delivery_mode === 'mobile';
  const recNum = receiptNumber(booking.id);

  // Header: brand block + RECEIPT block
  drawText('Calgary Oaths', MARGIN_X, { size: 18, font: bold });
  drawText('RECEIPT', PAGE_WIDTH - MARGIN_X - bold.widthOfTextAtSize('RECEIPT', 14), { size: 14, font: bold });
  nextLine(18, 2);
  drawText('Commissioner of Oaths . Notary Public . Apostille', MARGIN_X, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawText(recNum, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(recNum, 10), { size: 10, color: rgb(0.2, 0.2, 0.2) });
  nextLine(9, 2);
  drawText('(587) 600-0746 . info@calgaryoaths.com', MARGIN_X, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  const dateStr = new Date(booking.created_at).toLocaleDateString('en-CA');
  drawText(dateStr, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(dateStr, 9), { size: 9, color: rgb(0.4, 0.4, 0.4) });
  nextLine(8, 4);
  if (commissioner?.gst_number) {
    const gstLine = `GST/HST No.: ${commissioner.gst_number}`;
    drawText(gstLine, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(gstLine, 8), { size: 8, color: rgb(0.5, 0.5, 0.5) });
    nextLine(8, 8);
  } else {
    nextLine(0, 8);
  }
  drawDivider(rgb(0.6, 0.6, 0.6), 1);

  // Bill to + Service columns
  const colWidth = (writableWidth - 20) / 2;
  const col2X = MARGIN_X + colWidth + 20;

  drawText('BILL TO', MARGIN_X, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('SERVICE', col2X, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  nextLine(8, 6);

  const startY = y;
  const col1Y = (() => {
    drawParagraph(booking.name || '-', { size: 10, font: bold, spaceAfter: 1, maxWidth: colWidth });
    if (booking.email) drawParagraph(booking.email, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth });
    if (booking.phone) drawParagraph(booking.phone, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth });
    if (isMobile && booking.customer_address) drawParagraph(booking.customer_address, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 0, maxWidth: colWidth });
    const endY = y;
    y = startY;
    return endY;
  })();

  const col2Y = (() => {
    drawParagraph(booking.service_name || 'Commissioner of Oaths service', { size: 10, font: bold, spaceAfter: 1, maxWidth: colWidth, x: col2X });
    if (commissioner?.name) drawParagraph(`Commissioner: ${commissioner.name}`, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth, x: col2X });
    if (booking.appointment_datetime) {
      const appt = new Date(booking.appointment_datetime).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'medium', timeStyle: 'short' });
      drawParagraph(`Appointment: ${appt}`, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth, x: col2X });
    }
    drawParagraph(`Booking #: ${booking.id}`, { size: 8, color: rgb(0.5, 0.5, 0.5), spaceAfter: 0, maxWidth: colWidth, x: col2X });
    return y;
  })();

  y = Math.min(col1Y, col2Y) - 12;
  drawDivider();

  // Line items
  const descX = MARGIN_X;
  const totalX = PAGE_WIDTH - MARGIN_X - 60;

  drawText('DESCRIPTION', descX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('AMOUNT', totalX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  nextLine(8, 6);
  drawDivider();

  function drawItem(desc: string, cents: number) {
    drawText(desc, descX, { size: 10 });
    drawText(formatCents(cents), totalX, { size: 10 });
    nextLine(10, 6);
  }

  const docNote = (booking.num_documents ?? 1) > 1 ? ' (first document)' : '';
  drawItem(`${booking.service_name || 'Service'}${docNote}`, b.serviceFee);
  if (booking.num_documents != null && booking.num_documents > 1) {
    drawParagraph('Additional documents are charged in person at the appointment.', { size: 8, color: rgb(0.5, 0.5, 0.5), spaceAfter: 2, maxWidth: writableWidth - 80 });
  }
  if (b.travelFee > 0) drawItem('Mobile service travel fee', b.travelFee);
  if (b.convenienceFee > 0) drawItem('Convenience fee (platform)', b.convenienceFee);

  drawDivider();

  // Totals
  function drawSummaryRow(label: string, value: string, opts: { bold?: boolean; size?: number } = {}) {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const labelW = f.widthOfTextAtSize(label, size);
    drawText(label, totalX - labelW - 20, { size, font: f });
    drawText(value, totalX, { size, font: f });
    nextLine(size, 4);
  }

  drawSummaryRow('Subtotal', formatCents(subtotal));
  const gstPct = b.rate * 100;
  drawSummaryRow(`GST (${Number.isInteger(gstPct) ? gstPct : gstPct.toFixed(2)}%)`, formatCents(b.taxCents));
  y -= 4;
  drawDivider(rgb(0.4, 0.4, 0.4), 1);
  drawSummaryRow('Total', formatCents(b.total), { bold: true, size: 12 });

  // Paid stamp
  y -= 6;
  page.drawRectangle({
    x: MARGIN_X, y: y - 28, width: writableWidth, height: 28,
    color: rgb(0.92, 0.97, 0.92), borderColor: rgb(0.7, 0.85, 0.7), borderWidth: 0.5,
  });
  const paidLabel = 'PAID IN FULL';
  const piRef = booking.stripe_payment_intent_id ? ` (ref: ${booking.stripe_payment_intent_id})` : '';
  const detail = ` - Card via Stripe${piRef}.`;
  page.drawText(sanitize(paidLabel), { x: MARGIN_X + 10, y: y - 18, size: 10, font: bold, color: rgb(0.15, 0.45, 0.2) });
  const labelW = bold.widthOfTextAtSize(paidLabel, 10);
  page.drawText(sanitize(detail), { x: MARGIN_X + 10 + labelW, y: y - 18, size: 9, font, color: rgb(0.15, 0.3, 0.15) });
  y -= 40;

  // Footer
  drawDivider(rgb(0.85, 0.85, 0.85));
  const footerText = 'Thank you for your business . calgaryoaths.com';
  drawText(footerText, (PAGE_WIDTH - font.widthOfTextAtSize(footerText, 9)) / 2, { size: 9, color: rgb(0.55, 0.55, 0.55) });

  return pdf.save();
}
