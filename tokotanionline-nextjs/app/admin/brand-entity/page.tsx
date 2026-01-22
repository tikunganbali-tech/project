/**
 * BRAND ENTITY - Admin Dashboard
 * 
 * STATUS: DISABLED - Feature removed as non-core
 */

import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function BrandEntityPage() {
  // 🔒 SECURITY: Use consistent guard pattern
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'super_admin',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Feature removed - show clear message
  return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-900 mb-2">Brand Entity Feature Removed</h2>
        <p className="text-yellow-700 mb-4">
          This feature has been removed as part of core system refactoring.
        </p>
        <p className="text-sm text-yellow-600">
          Status: Removed (Non-core feature)
        </p>
      </div>
    </div>
  );
}

