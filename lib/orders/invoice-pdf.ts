import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Order, OrderItem } from './types';
import { computeTaxBreakdown, lineTotalCents, formatCents, type TaxRateRow } from './pricing';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;

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
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            if (chunk) lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface BuildInvoicePdfArgs {
  order: Order;
  items: OrderItem[];
  taxRate: TaxRateRow | null;
}

export async function buildInvoicePdf({ order, items, taxRate }: BuildInvoicePdfArgs): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const writableWidth = PAGE_WIDTH - MARGIN_X * 2;

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < MARGIN_BOTTOM) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  }

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
    const lines = wrapText(sanitize(text), useFont, size, maxW);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: xPos, y: y - size, size, font: useFont, color });
      y -= lineHeight;
    }
    y -= opts.spaceAfter ?? 4;
  }

  function drawDivider(color = rgb(0.75, 0.75, 0.75), thickness = 0.5) {
    ensureSpace(8);
    page.drawLine({
      start: { x: MARGIN_X, y: y - 2 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y - 2 },
      thickness,
      color,
    });
    y -= 10;
  }

  const isApostille = order.order_type === 'apostille';
  const fullAddress = [
    order.customer_address_unit,
    order.customer_address_street,
    order.customer_address_city,
    order.customer_address_province,
    order.customer_address_postal,
    order.customer_address_country,
  ].filter(Boolean).join(', ');
  const travelFee = order.travel_fee_cents || 0;
  const taxBreakdown = computeTaxBreakdown(order.subtotal_cents, taxRate);

  // Header: brand block + INVOICE block side-by-side
  ensureSpace(60);
  drawText('Calgary Oaths', MARGIN_X, { size: 18, font: bold });
  drawText('INVOICE', PAGE_WIDTH - MARGIN_X - bold.widthOfTextAtSize('INVOICE', 14), { size: 14, font: bold });
  nextLine(18, 2);
  drawText('Commissioner of Oaths . Notary Public . Apostille', MARGIN_X, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  const invNum = order.invoice_number || order.order_number;
  drawText(invNum, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(invNum, 10), { size: 10, color: rgb(0.2, 0.2, 0.2) });
  nextLine(9, 2);
  drawText('(587) 600-0746 . info@calgaryoaths.com', MARGIN_X, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  const dateStr = new Date(order.invoice_generated_at || order.created_at).toLocaleDateString();
  drawText(dateStr, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(dateStr, 9), { size: 9, color: rgb(0.4, 0.4, 0.4) });
  nextLine(8, 12);
  drawDivider(rgb(0.6, 0.6, 0.6), 1);

  // Bill to + Service columns
  const colWidth = (writableWidth - 20) / 2;
  const col2X = MARGIN_X + colWidth + 20;
  const startY = y;

  drawText('BILL TO', MARGIN_X, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('SERVICE', col2X, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  nextLine(8, 6);

  // Two-column body: render col1 lines, capture final y, then render col2 from startY
  const col1Y = (() => {
    const savedY = y;
    drawParagraph(order.customer_name || '-', { size: 10, font: bold, spaceAfter: 1, maxWidth: colWidth });
    if (order.customer_email) drawParagraph(order.customer_email, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth });
    if (order.customer_phone) drawParagraph(order.customer_phone, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth });
    if (fullAddress) drawParagraph(fullAddress, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 0, maxWidth: colWidth });
    const endY = y;
    y = savedY;
    return endY;
  })();

  const col2Y = (() => {
    drawParagraph(isApostille ? 'Apostille / Authentication' : 'Notarization / Oath Commissioner', { size: 10, font: bold, spaceAfter: 1, maxWidth: colWidth, x: col2X });
    if (!isApostille && order.service_role) {
      drawParagraph(order.service_role === 'notary' ? 'Notary Public' : 'Commissioner of Oaths', { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth, x: col2X });
    }
    if (isApostille && order.destination_country) {
      drawParagraph(`Destination: ${order.destination_country}`, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth, x: col2X });
    }
    drawParagraph(`Order #: ${order.order_number}`, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1, maxWidth: colWidth, x: col2X });
    drawParagraph(`Date: ${new Date(order.order_date || order.created_at).toLocaleDateString()}`, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 0, maxWidth: colWidth, x: col2X });
    return y;
  })();

  y = Math.min(col1Y, col2Y) - 12;
  drawDivider();

  // Items table
  const descX = MARGIN_X;
  const qtyX = PAGE_WIDTH - MARGIN_X - 200;
  const unitX = PAGE_WIDTH - MARGIN_X - 130;
  const totalX = PAGE_WIDTH - MARGIN_X - 60;

  ensureSpace(20);
  drawText('DESCRIPTION', descX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('QTY', qtyX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('UNIT', unitX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  drawText('TOTAL', totalX, { size: 8, font: bold, color: rgb(0.45, 0.45, 0.45) });
  nextLine(8, 6);
  drawDivider();

  for (const it of items) {
    ensureSpace(18);
    const desc = it.description || it.item_type || 'Item';
    drawText(desc, descX, { size: 10 });
    drawText(String(it.quantity), qtyX, { size: 10 });
    drawText(formatCents(it.unit_price_cents), unitX, { size: 10 });
    const lineCents = lineTotalCents(it);
    drawText(formatCents(lineCents), totalX, { size: 10 });
    nextLine(10, 4);
    if (it.notes) {
      drawParagraph(it.notes, { size: 9, color: rgb(0.45, 0.45, 0.45), spaceAfter: 4, maxWidth: writableWidth - 220 });
    }
  }

  if (travelFee > 0) {
    ensureSpace(18);
    drawText('Travel fee', descX, { size: 10 });
    drawText(formatCents(travelFee), totalX, { size: 10 });
    nextLine(10, 4);
  }

  drawDivider();

  // Totals
  function drawSummaryRow(label: string, value: string, opts: { bold?: boolean; size?: number } = {}) {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    ensureSpace(size + 4);
    const labelW = f.widthOfTextAtSize(label, size);
    drawText(label, unitX - labelW + 30, { size, font: f });
    drawText(value, totalX, { size, font: f });
    nextLine(size, 4);
  }

  drawSummaryRow('Subtotal', formatCents(order.subtotal_cents));
  if (taxBreakdown.hst_cents > 0) drawSummaryRow(`HST (${(taxBreakdown.hst_rate * 100).toFixed(taxBreakdown.hst_rate * 100 % 1 === 0 ? 0 : 2)}%)`, formatCents(taxBreakdown.hst_cents));
  if (taxBreakdown.gst_cents > 0) drawSummaryRow(`GST (${(taxBreakdown.gst_rate * 100).toFixed(taxBreakdown.gst_rate * 100 % 1 === 0 ? 0 : 2)}%)`, formatCents(taxBreakdown.gst_cents));
  if (taxBreakdown.pst_cents > 0) drawSummaryRow(`PST (${(taxBreakdown.pst_rate * 100).toFixed(taxBreakdown.pst_rate * 100 % 1 === 0 ? 0 : 2)}%)`, formatCents(taxBreakdown.pst_cents));
  if (taxBreakdown.total_cents === 0) drawSummaryRow('No tax', formatCents(0));
  if ((order.discount_cents || 0) > 0) drawSummaryRow('Discount', `-${formatCents(order.discount_cents || 0)}`);
  y -= 4;
  drawDivider(rgb(0.4, 0.4, 0.4), 1);
  drawSummaryRow('Total', formatCents(order.total_cents), { bold: true, size: 12 });

  // Payment status
  if (order.payment_method) {
    y -= 6;
    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 28,
      width: writableWidth,
      height: 28,
      color: rgb(0.92, 0.97, 0.92),
      borderColor: rgb(0.7, 0.85, 0.7),
      borderWidth: 0.5,
    });
    const paidLabel = 'Paid in full';
    const detail = `${order.payment_method.replace('_', ' ')}${order.payment_reference ? ` (ref: ${order.payment_reference})` : ''}${order.paid_at ? ` on ${new Date(order.paid_at).toLocaleString()}` : ''}.`;
    page.drawText(sanitize(paidLabel), { x: MARGIN_X + 10, y: y - 18, size: 10, font: bold, color: rgb(0.15, 0.45, 0.2) });
    const labelW = bold.widthOfTextAtSize(paidLabel, 10);
    page.drawText(sanitize(` - ${detail}`), { x: MARGIN_X + 10 + labelW, y: y - 18, size: 10, font, color: rgb(0.15, 0.3, 0.15) });
    y -= 36;
  }

  // Footer
  ensureSpace(20);
  y -= 8;
  drawDivider(rgb(0.85, 0.85, 0.85));
  const footerText = 'Thank you for your business . calgaryoaths.com';
  drawText(footerText, (PAGE_WIDTH - font.widthOfTextAtSize(footerText, 9)) / 2, { size: 9, color: rgb(0.55, 0.55, 0.55) });

  return pdf.save();
}
