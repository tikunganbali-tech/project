import { FEATURES } from '@/lib/feature-flags';

export async function requireAdminAuth() {
  if (!FEATURES.ADMIN_AUTH) {
    return null; // SAFE MODE — NO AUTH, NO DB, NO THROW
  }

  const { getServerSession } = await import('@/lib/auth');
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}
