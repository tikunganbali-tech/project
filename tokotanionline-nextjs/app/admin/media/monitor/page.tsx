/**
 * UI-C1 — MEDIA MONITOR PAGE
 * 
 * Route: /admin/media/monitor
 * Status: READ-ONLY | OBSERVABILITY
 * 
 * Tujuan: Melihat kondisi media sebenarnya
 * - Media mana sehat (USED)
 * - Media mana sampah (ORPHAN)
 * 
 * Rules:
 * ❌ Tidak bisa upload
 * ❌ Tidak bisa edit
 * ❌ Tidak bisa generate
 * ✅ Hanya: lihat, filter, tandai ORPHAN
 */

import MediaMonitorClient from '@/components/admin/MediaMonitorClient';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MediaMonitorPage() {
  // Check guard (with dev mode support)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin',
    devModeStatus: 'read-only',
    devModeNote: 'Media monitor is available in read-only mode. You can view but not modify media.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get session for userRole (already checked in guard)
  const session = await getServerSession();
  const userRole = (session?.user as any)?.role || 'viewer';

  return <MediaMonitorClient userRole={userRole} />;
}
