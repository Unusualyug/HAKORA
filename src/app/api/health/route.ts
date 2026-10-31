import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'unavailable';
  }
  const status = db === 'ok' ? 200 : 503;
  return NextResponse.json(
    { status: db === 'ok' ? 'healthy' : 'degraded', database: db, time: new Date().toISOString() },
    { status },
  );
}
