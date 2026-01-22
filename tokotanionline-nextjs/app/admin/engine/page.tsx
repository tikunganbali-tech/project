/**
 * UI-B1: Engine Status Page
 * 
 * Route: /admin/engine
 * 
 * Displays:
 * - Engine Status: RUNNING / STOPPED (based on heartbeat)
 * - Last Heartbeat (timestamp)
 * - Uptime (hh:mm)
 * - Scheduler Worker: ACTIVE / IDLE
 * - Queue Summary: Pending, Processing, Done (today), Failed
 * - Pause/Resume control
 */

import EngineStatusMonitorClient from '@/components/admin/engine/EngineStatusMonitorClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function EngineStatusPage() {
  // Check guard (with dev mode support)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'super_admin',
    devModeStatus: 'locked',
    devModeNote: 'Engine status page requires super_admin role. Engine may not be active.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Engine Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          UI-B1 — Monitor kondisi mesin & pekerjaan tanpa terminal/log teknis
        </p>
      </div>

      <EngineStatusMonitorClient />
    </div>
  );
}
