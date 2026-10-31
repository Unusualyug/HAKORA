'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionCookie, clearSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/auth/rate-limit';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function adminLogin(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: 'Too many login attempts. Please wait 15 minutes.' };
  }
  if (!email || !password) return { error: 'Email and password are required.' };

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const generic = { error: 'Invalid email or password.' };
  if (!admin || !admin.isActive) return generic;

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { error: 'Account temporarily locked due to repeated failed attempts. Try again later.' };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    const failed = admin.failedAttempts + 1;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedAttempts: failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return generic;
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'login', meta: { ip } },
  });

  const cookie = createSessionCookie(admin.id, admin.role);
  cookies().set(cookie.name, cookie.value, cookie.options);
  redirect('/admin');
}

export async function adminLogout() {
  const c = clearSessionCookie();
  cookies().set(c.name, '', c.options);
  redirect('/admin/login');
}
