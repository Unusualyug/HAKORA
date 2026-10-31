import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await prisma.adminUser.findUnique({ where: { id: session.uid } });
  if (!admin || !admin.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const where: Record<string, unknown> = { archived: sp.get('archived') === '1' };
  const status = sp.get('status');
  if (status) where.status = status;
  const q = sp.get('q');
  if (q) {
    where.OR = [
      { refNo: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { customer: { fullName: { contains: q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: q } } },
      { customer: { college: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const rows = await prisma.enquiry.findMany({
    where: where as never,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = ['Enquiry ID','Name','Mobile','College','Service','Description','Status','Quotation (INR)','Needs Delivery','Submitted At (IST)'];
  const lines = [header.join(',')];
  const fmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  for (const r of rows) {
    lines.push([
      r.refNo, r.customer.fullName, r.customer.mobile, r.customer.college ?? '',
      r.serviceCategory ?? '', r.description.replace(/\s+/g, ' ').slice(0, 500),
      r.status, r.quotationAmount?.toString() ?? '', r.needsDelivery ? 'Yes' : 'No',
      fmt.format(r.createdAt),
    ].map(csvCell).join(','));
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
