/**
 * PHASE 6B — SYSTEM MONITORING PAGE
 * 
 * Page: /admin/system/monitoring
 * 
 * Fungsi: Read-only system monitoring
 * - Integration status
 * - Scheduler status
 * - Active alerts
 */

import { Suspense } from 'react';
import SystemMonitoringClient from '@/components/admin/SystemMonitoringClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
}

export default async function SystemMonitoringPage() {
  try {
    // 🔒 GUARD: Check with dev mode support
    const guardResult = await enforceAdminPageGuard({
      requireAuth: true,
      requirePermission: 'system.view',
      devModeStatus: 'read-only',
      devModeNote: 'System monitoring is available in read-only mode during development.',
    });

    // If dev mode shows status component, return it
    if (guardResult.statusComponent) {
      return guardResult.statusComponent;
    }

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            System Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of system health, integrations, and scheduler status
          </p>
        </div>

        {/* Monitoring Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border">
          <Suspense fallback={<LoadingSkeleton />}>
            <SystemMonitoringClient />
          </Suspense>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('❌ [SystemMonitoringPage] Error:', error);
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Page</h2>
          <p className="text-red-700">{error.message || 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }
}
