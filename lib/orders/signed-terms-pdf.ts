import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface TermsInfo {
  version: string;
  content_md: string;
}

interface OrderInfo {
  order_number: string;
  order_type: string;
  order_date?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address_unit?: string | null;
  customer_address_street?: string | null;
  customer_address_city?: string | null;
  customer_address_province?: string | null;
  customer_address_postal?: string | null;
  customer_address_country?: string | null;
  terms_accepted_at?: string | null;
  signed_at?: string | null;
  signed_ip?: string | null;
  signed_user_agent?: string | null;
}

interface BuildSignedTermsPdfArgs {
  order: OrderInfo;
  terms: TermsInfo;
  signature: {
    buffer: Buffer;
    contentType: string;
  };
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;

// pdf-lib's standard fonts (WinAnsi) don't support arbitrary unicode. Strip or
// replace common non-ASCII characters so the PDF doesn't fail to encode.
function sanitize(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•]/g, '*')
    .replace(/[ ]/g, ' ')
    .replace(/[…]/g, '...')
    // Drop anything outside basic Latin-1 to avoid WinAnsi encode errors
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
      // Word itself wider than maxWidth: hard-break by char
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

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export async function buildSignedTermsPdf({ order, terms, signature }: BuildSignedTermsPdfArgs): Promise<Uint8Array> {
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

  function drawLine(text: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const useFont = opts.font ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    const gap = opts.gap ?? 4;
    ensureSpace(size + gap);
    page.drawText(sanitize(text), { x: MARGIN_X, y: y - size, size, font: useFont, color });
    y -= size + gap;
  }

  function drawParagraph(text: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; spaceAfter?: number } = {}) {
    const size = opts.size ?? 10;
    const useFont = opts.font ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    const lineHeight = size * 1.4;
    const lines = wrapText(sanitize(text), useFont, size, writableWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: MARGIN_X, y: y - size, size, font: useFont, color });
      y -= lineHeight;
    }
    y -= opts.spaceAfter ?? 4;
  }

  function drawDivider() {
    ensureSpace(10);
    page.drawLine({
      start: { x: MARGIN_X, y: y - 2 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y - 2 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    y -= 12;
  }

  // Header
  drawLine('Calgary Oaths', { size: 18, font: bold });
  drawLine('Commissioner of Oaths . Notary Public . Apostille', { size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawLine('(587) 600-0746 . info@calgaryoaths.com', { size: 8, color: rgb(0.5, 0.5, 0.5), gap: 6 });
  drawLine(`SIGNED TERMS & CONDITIONS`, { size: 12, font: bold });
  drawLine(`Order #: ${order.order_number}   Version: ${terms.version}`, { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 8 });
  drawDivider();

  // Customer + service
  drawLine('Customer', { size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) });
  drawParagraph(order.customer_name || '-', { size: 10, font: bold });
  if (order.customer_email) drawParagraph(order.customer_email, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1 });
  if (order.customer_phone) drawParagraph(order.customer_phone, { size: 9, color: rgb(0.35, 0.35, 0.35), spaceAfter: 1 });
  const address = [
    order.customer_address_unit,
    order.customer_address_street,
    order.customer_address_city,
    order.customer_address_province,
    order.customer_address_postal,
    order.customer_address_country,
  ].filter(Boolean).join(', ');
  if (address) drawParagraph(address, { size: 9, color: rgb(0.35, 0.35, 0.35) });

  y -= 4;
  drawLine('Service', { size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) });
  drawParagraph(order.order_type === 'apostille' ? 'Apostille / Authentication' : 'Notarization / Oath Commissioner', { size: 10, font: bold });
  drawParagraph(`Order date: ${fmtDate(order.order_date)}`, { size: 9, color: rgb(0.35, 0.35, 0.35) });

  drawDivider();

  // Terms content (markdown-lite)
  drawLine('Terms & Conditions', { size: 11, font: bold, gap: 8 });
  const tcLines = sanitize(terms.content_md).split('\n');
  for (const raw of tcLines) {
    const line = raw.trim();
    if (!line) { y -= 4; continue; }
    if (line.startsWith('# ')) {
      drawParagraph(line.slice(2), { size: 11, font: bold, spaceAfter: 2 });
    } else {
      const cleaned = line.replace(/\*\*(.+?)\*\*/g, '$1');
      drawParagraph(cleaned, { size: 10 });
    }
  }

  drawDivider();

  // Acceptance section
  drawLine('Customer acceptance', { size: 11, font: bold, gap: 8 });
  drawParagraph(
    `Customer accepted terms and conditions (v${terms.version}) on ${fmtDateTime(order.terms_accepted_at)}.`,
    { size: 10 }
  );
  if (order.signed_ip) drawParagraph(`Signed from IP: ${order.signed_ip}`, { size: 9, color: rgb(0.4, 0.4, 0.4), spaceAfter: 1 });
  if (order.signed_user_agent) drawParagraph(`User agent: ${order.signed_user_agent}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });

  y -= 6;
  drawLine(`Signature (${fmtDateTime(order.signed_at)})`, { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 6 });

  // Embed signature image
  try {
    const isJpeg = signature.contentType.includes('jpeg') || signature.contentType.includes('jpg');
    const img = isJpeg
      ? await pdf.embedJpg(signature.buffer)
      : await pdf.embedPng(signature.buffer);
    const maxW = 240;
    const maxH = 80;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    ensureSpace(h + 4);
    page.drawImage(img, { x: MARGIN_X, y: y - h, width: w, height: h });
    y -= h + 4;
  } catch (err) {
    drawParagraph('[Signature image could not be embedded]', { size: 9, color: rgb(0.7, 0.2, 0.2) });
  }

  return pdf.save();
}
