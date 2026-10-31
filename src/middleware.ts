import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'cs_admin_session';

/**
 * Edge gate for /admin — quick redirect when no session cookie exists.
 * Real verification (HMAC + DB) happens server-side in requireAdmin();
 * this only prevents anonymous visitors from loading admin shells.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
