/**
 * PHASE C2-A — MEDIA LIBRARY PAGE
 * 
 * Server component untuk Media Library admin page
 */

import MediaLibraryClient from '@/components/admin/MediaLibraryClient';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMediaPage() {
  // Check guard (with dev mode support)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin',
    devModeStatus: 'read-only',
    devModeNote: 'Media library is available in read-only mode during development.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get session for userRole (already checked in guard)
  const session = await getServerSession();
  const userRole = (session?.user as any)?.role || 'viewer';

  return <MediaLibraryClient userRole={userRole} />;
}
