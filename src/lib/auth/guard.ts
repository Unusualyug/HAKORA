import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './session';
import { prisma } from '@/lib/db';

/** Server-side guard for admin pages & actions. Redirects to login when unauthenticated. */
export async function requireAdmin() {
  const session = getSession();
  if (!session) redirect('/admin/login');
  const admin = await prisma.adminUser.findUnique({ where: { id: session.uid } });
  if (!admin || !admin.isActive) redirect('/admin/login');
  return admin;
}

/** Guard for server actions / route handlers – throws instead of redirecting. */
export async function requireAdminOrThrow() {
  const session = getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const admin = await prisma.adminUser.findUnique({ where: { id: session.uid } });
  if (!admin || !admin.isActive) throw new Error('UNAUTHORIZED');
  return admin;
}
