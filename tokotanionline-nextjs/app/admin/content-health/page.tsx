/**
 * UI-C3 — CONTENT HEALTH DASHBOARD PAGE
 * 
 * Route: /admin/content-health
 * Status: READ-ONLY | OBSERVABILITY
 * 
 * Tujuan: Owner langsung tahu apakah situsnya sehat atau berisiko
 * Ringkasan:
 * - Total konten
 * - READY %
 * - WARNING %
 * - RISK %
 */

import ContentHealthClient from '@/components/admin/ContentHealthClient';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContentHealthPage() {
  // 🔒 SECURITY: Check authentication and permissions using guard
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin', // admin or super_admin (checked in guard)
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get session for userRole (already checked in guard)
  const session = await getServerSession();
  const userRole = (session?.user as any)?.role;

  return <ContentHealthClient userRole={userRole} />;
}
