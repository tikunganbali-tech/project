/**
 * UI-B5: Engine Logs Page
 * 
 * Route: /admin/engine/logs
 * 
 * Displays human-readable logs:
 * - Timestamp
 * - Event (Scheduler loop start, Job started, Job finished, Job failed)
 * - Message (singkat, tidak ada stack trace)
 */

import EngineLogsRingkasClient from '@/components/admin/engine/EngineLogsRingkasClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function EngineLogsPage() {
  // Check guard (with dev mode support)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'super_admin',
    devModeStatus: 'locked',
    devModeNote: 'Engine logs require super_admin role and active engine. Engine may not be ready.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Engine Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          UI-B5 — Log ringkas yang mudah dibaca • Auto-refresh 12s
        </p>
      </div>

      <EngineLogsRingkasClient />
    </div>
  );
}

