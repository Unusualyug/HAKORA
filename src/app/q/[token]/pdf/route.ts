import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashAccessToken, isValidTokenFormat } from '@/lib/tokens';
import { generateQuotePdf } from '@/lib/pdf';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import { rateLimit } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

/** Public quotation PDF — authorized purely by the unguessable token. */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`qpdf:${ip}`, 30, 10 * 60 * 1000)) return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  if (!isValidTokenFormat(params.token)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const q = await prisma.quotation.findUnique({
    where: { tokenHash: hashAccessToken(params.token) },
    include: { customer: true, items: { orderBy: { sortOrder: 'asc' } }, payments: true },
  });
  if (!q || q.status === 'DRAFT') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const settings = await getSettings();
  const inr = (v: unknown) => `Rs. ${Number(v).toLocaleString('en-IN')}`;
  const paid = q.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);

  const pdf = await generateQuotePdf({
    docType: 'QUOTATION',
    brand: settings.businessName,
    tagline: settings.tagline,
    contact: `${settings.contactPhone} · ${settings.businessEmail} · ${settings.serviceArea}`,
    refNo: `${q.quoteNo}${q.revisionNo > 1 ? ` (Rev ${q.revisionNo})` : ''}`,
    date: formatDate(q.createdAt),
    validUntil: q.validUntil ? formatDate(q.validUntil) : undefined,
    customerName: q.customer.fullName,
    customerMobile: `+91 ${q.customer.mobile}`,
    customerCollege: q.customer.college ?? undefined,
    title: q.title,
    items: q.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity).toString(),
      unitPrice: inr(i.unitPrice),
      lineTotal: inr(i.lineTotal),
    })),
    subtotal: inr(q.subtotal),
    discount: inr(q.discount),
    taxLabel: `${q.taxLabel} (${Number(q.taxRate)}%)`,
    taxAmount: inr(q.taxAmount),
    total: inr(q.total),
    paidAmount: paid > 0 ? inr(paid) : undefined,
    advanceNote:
      q.advanceType === 'FULL'
        ? 'Full payment to confirm the order.'
        : `Advance of ${inr(q.advanceAmount)} to confirm; balance before delivery.`,
    paymentTerms: q.paymentTerms ?? undefined,
    notes: q.notes ?? undefined,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${q.quoteNo}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
