import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Line = { description: string; quantity: string; unitPrice: string; lineTotal: string };
export type QuotePdfData = {
  docType: 'QUOTATION' | 'PAYMENT RECEIPT';
  brand: string;
  tagline: string;
  contact: string;
  refNo: string;
  date: string;
  validUntil?: string;
  customerName: string;
  customerMobile: string;
  customerCollege?: string;
  title: string;
  items: Line[];
  subtotal: string;
  discount?: string;
  taxLabel?: string;
  taxAmount?: string;
  total: string;
  advanceNote?: string;
  paymentTerms?: string;
  notes?: string;
  paidAmount?: string;
  paymentRef?: string;
};

const NAVY = rgb(0.067, 0.11, 0.2);
const ROYAL = rgb(0.157, 0.298, 0.886);
const GRAY = rgb(0.45, 0.5, 0.56);
const LIGHT = rgb(0.93, 0.95, 0.98);

// pdf-lib's standard fonts are WinAnsi — strip chars they can't encode (₹ etc.)
const sanitize = (s: string) => s.replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E]/g, '');

export async function generateQuotePdf(d: QuotePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const M = 50;
  let y = 792;

  const text = (s: string, x: number, size = 10, f = font, color = NAVY) =>
    page.drawText(sanitize(s), { x, y, size, font: f, color });
  const right = (s: string, size = 10, f = font, color = NAVY, xRight = width - M) => {
    const t = sanitize(s);
    page.drawText(t, { x: xRight - f.widthOfTextAtSize(t, size), y, size, font: f, color });
  };

  // Header
  page.drawRectangle({ x: 0, y: 772, width, height: 70, color: NAVY });
  y = 812; text(d.brand, M, 22, bold, rgb(1, 1, 1));
  y = 794; text(d.tagline, M, 9, font, rgb(0.75, 0.8, 0.9));
  y = 812; right(d.docType, 16, bold, rgb(1, 1, 1));
  y = 794; right(d.refNo, 10, font, rgb(0.75, 0.8, 0.9));

  // Meta row
  y = 742;
  text('Prepared for', M, 8, bold, GRAY);
  right(`Date: ${d.date}`, 9, font, GRAY);
  y -= 14; text(d.customerName, M, 12, bold);
  if (d.validUntil) right(`Valid until: ${d.validUntil}`, 9, font, GRAY);
  y -= 13; text(`${d.customerMobile}${d.customerCollege ? '  ·  ' + d.customerCollege : ''}`, M, 9, font, GRAY);
  y -= 22; text(d.title, M, 11, bold, ROYAL);

  // Table header
  y -= 24;
  page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 20, color: LIGHT });
  text('DESCRIPTION', M + 8, 8, bold, GRAY);
  text('QTY', 350, 8, bold, GRAY);
  text('UNIT PRICE', 405, 8, bold, GRAY);
  right('AMOUNT', 8, bold, GRAY, width - M - 8);

  // Items
  y -= 24;
  for (const item of d.items.slice(0, 18)) {
    const desc = sanitize(item.description).slice(0, 58);
    text(desc, M + 8, 9.5);
    text(item.quantity, 350, 9.5);
    text(item.unitPrice, 405, 9.5);
    right(item.lineTotal, 9.5, font, NAVY, width - M - 8);
    y -= 18;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: width - M, y: y + 6 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.96) });
  }

  // Totals
  y -= 10;
  const totalRow = (label: string, value: string, isBold = false, color = NAVY) => {
    text(label, 370, isBold ? 11 : 9.5, isBold ? bold : font, isBold ? color : GRAY);
    right(value, isBold ? 11 : 9.5, isBold ? bold : font, color, width - M - 8);
    y -= isBold ? 20 : 16;
  };
  totalRow('Subtotal', d.subtotal);
  if (d.discount && d.discount !== 'Rs. 0') totalRow('Discount', `- ${d.discount}`);
  if (d.taxAmount && d.taxAmount !== 'Rs. 0') totalRow(d.taxLabel || 'Tax', d.taxAmount);
  page.drawLine({ start: { x: 370, y: y + 10 }, end: { x: width - M, y: y + 10 }, thickness: 1, color: NAVY });
  y -= 4;
  totalRow('TOTAL', d.total, true);
  if (d.paidAmount) totalRow('PAID', d.paidAmount, true, rgb(0.08, 0.55, 0.3));

  // Notes / terms
  y -= 10;
  const para = (label: string, body?: string) => {
    if (!body) return;
    text(label, M, 8, bold, GRAY);
    y -= 13;
    for (const ln of sanitize(body).match(/.{1,95}(\s|$)/g)?.slice(0, 3) ?? []) {
      text(ln.trim(), M, 9);
      y -= 13;
    }
    y -= 6;
  };
  para('PAYMENT TERMS', d.advanceNote ? `${d.advanceNote}${d.paymentTerms ? ' — ' + d.paymentTerms : ''}` : d.paymentTerms);
  para('NOTES', d.notes);
  if (d.paymentRef) para('PAYMENT REFERENCE', d.paymentRef);

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 46, color: LIGHT });
  y = 27; text(d.brand, M, 9, bold);
  y = 15; text(d.contact, M, 8, font, GRAY);
  y = 20; right('Thank you for choosing us!', 9, font, GRAY);

  return doc.save();
}
