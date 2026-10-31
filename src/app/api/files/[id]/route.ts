import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getSignedDownloadUrl, readLocalFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Private file download — admin session required. S3 → 302 to 5-min signed URL; local → stream. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await prisma.adminUser.findUnique({ where: { id: session.uid } });
  if (!admin || !admin.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const att = await prisma.enquiryAttachment.findUnique({ where: { id: params.id } });
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (att.storage === 's3') {
    const url = await getSignedDownloadUrl(att.storedKey, att.fileName);
    if (url) return NextResponse.redirect(url, 302);
  }
  try {
    const buf = await readLocalFile(att.storedKey);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': att.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(att.fileName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  }
}
