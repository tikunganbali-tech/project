/**
 * UI-B2: Job Monitor Page
 * 
 * Route: /admin/engine/jobs
 * 
 * Displays:
 * - Job ID
 * - Type: BLOG / PRODUCT
 * - Primary Keyword
 * - Schedule Name
 * - Status: PENDING, PROCESSING, DONE, FAILED
 * - Started At, Finished At, Duration
 * - Error (human-readable)
 * - Actions: Retry (FAILED only), Skip (PENDING/FAILED)
 */

import JobMonitorClient from '@/components/admin/engine/JobMonitorClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function EngineJobsPage() {
  // Check guard (with dev mode support)
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'super_admin',
    devModeStatus: 'locked',
    devModeNote: 'Job monitor requires super_admin role and active engine. Engine may not be ready.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          UI-B2 — Monitor pekerjaan engine dengan kontrol retry & skip
        </p>
      </div>

      <JobMonitorClient />
    </div>
  );
}

