/**
 * UI-C2 — SEO MONITOR PAGE
 * 
 * Route: /admin/seo/monitor
 * Status: READ-ONLY | OBSERVABILITY
 * 
 * Tujuan: Melihat kondisi SEO konten sebenarnya
 * - SEO mana siap (READY)
 * - SEO mana berisiko (RISK)
 * - SEO mana perlu perhatian (WARNING)
 */

import SeoMonitorClient from '@/components/admin/SeoMonitorClient';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SeoMonitorPage() {
  // 🔒 SECURITY: Use consistent guard (fix auth redirect issue)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin',
    devModeStatus: 'read-only',
    devModeNote: 'SEO monitor is available in read-only mode during development.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get session for userRole (already checked in guard)
  const session = await getServerSession();
  const userRole = (session?.user as any)?.role || 'viewer';

  return <SeoMonitorClient userRole={userRole} />;
}
