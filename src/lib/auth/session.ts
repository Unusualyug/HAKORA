import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'cs_admin_session';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET must be set (16+ chars)');
  return s;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export type SessionData = { uid: string; role: string; exp: number };

export function encodeSession(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): SessionData | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    if (!data.uid || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function createSessionCookie(uid: string, role: string) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  return {
    name: COOKIE_NAME,
    value: encodeSession({ uid, role, exp }),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_HOURS * 3600,
    },
  };
}

export function getSession(): SessionData | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return decodeSession(token);
}

export function clearSessionCookie() {
  return { name: COOKIE_NAME, options: { path: '/', maxAge: 0 } };
}

export const SESSION_COOKIE = COOKIE_NAME;
