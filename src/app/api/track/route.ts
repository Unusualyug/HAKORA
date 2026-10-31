import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set([
  'page_view', 'service_click', 'form_start', 'form_submit',
  'whatsapp_click', 'bulk_whatsapp_click', 'contact_view',
]);

function deviceType(ua: string) {
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}
function browser(ua: string) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`track:${ip}`, 120, 60_000)) return NextResponse.json({ ok: true });

  let body: { sid?: string; type?: string; path?: string; meta?: Record<string, unknown>; referrer?: string; consent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = String(body.type ?? '');
  if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

  const sid = typeof body.sid === 'string' && /^[a-zA-Z0-9_-]{10,64}$/.test(body.sid) ? body.sid : null;
  const ua = req.headers.get('user-agent') ?? '';
  const pagePath = typeof body.path === 'string' ? body.path.slice(0, 300) : null;
  // never track admin area
  if (pagePath?.startsWith('/admin')) return NextResponse.json({ ok: true });

  try {
    if (sid) {
      await prisma.anonymousSession.upsert({
        where: { id: sid },
        create: {
          id: sid,
          landingPage: pagePath,
          referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 300) : null,
          utmSource: typeof body.meta?.utm_source === 'string' ? String(body.meta.utm_source).slice(0, 100) : null,
          deviceType: deviceType(ua),
          browser: browser(ua),
          consent: !!body.consent,
        },
        update: { lastSeenAt: new Date(), consent: !!body.consent },
      });
    }
    await prisma.analyticsEvent.create({
      data: {
        sessionId: sid,
        type,
        path: pagePath,
        meta: (body.meta ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error('track error', e);
  }
  return NextResponse.json({ ok: true });
}
