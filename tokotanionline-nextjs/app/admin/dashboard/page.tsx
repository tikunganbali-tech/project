/**
 * FITUR 2: ADMIN DASHBOARD (OPERASIONAL)
 * 
 * Dashboard dengan data real-time dari API endpoints:
 * - Summary statistics (products, posts, drafts)
 * - Activity log (real data from ActivityLog)
 * - Engine status (real-time health checks)
 * - Alerts & warnings (system alerts)
 * 
 * PRINSIP:
 * - Live data dari API endpoints (bukan static/seed)
 * - Auto-refresh setiap 30 detik
 * - Skeleton loading saat fetch
 * - Tidak ada data dummy/placeholder
 */

import DashboardClient from '@/components/admin/DashboardClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // 🔒 SECURITY: Use consistent guard pattern
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'system.view',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // If we reach here, user is authenticated and has permission
  // Render client component with live data from API
  return <DashboardClient />;
}
