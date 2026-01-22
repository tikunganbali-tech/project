/**
 * PHASE 7C: Cross-Brand & Cross-Locale Insights Page (READ-ONLY)
 * 
 * Displays aggregated performance insights across brands and locales.
 * NO edit, NO publish, NO rewrite - informational only.
 */

import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth';
import InsightsDashboard from '@/components/admin/InsightsDashboard';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default async function InsightsPage() {
  try {
    // 🔒 GUARD: Check with dev mode support
    const guardResult = await enforceAdminPageGuard({
      requireAuth: true,
      requirePermission: 'insight.view',
      devModeStatus: 'read-only',
      devModeNote: 'Insights dashboard is available in read-only mode during development.',
    });

    // If dev mode shows status component, return it
    if (guardResult.statusComponent) {
      return guardResult.statusComponent;
    }

    // Get session for brand context (already checked in guard)
    const session = await getServerSession();
    if (!session || !session.user) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-700">Session not found. Please login again.</p>
          </div>
        </div>
      );
    }

    // Get admin for brand/locale context
    const { prisma } = await import('@/lib/prisma');
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
      include: { brand: true },
    });

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Cross-Brand & Cross-Locale Insights
          </h1>
          <p className="text-gray-600 mt-2">
            Aggregated performance insights across brands and locales (Read-Only)
          </p>
        </div>

        {/* PHASE 7C: Read-only warning */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-blue-900">⚠️ Read-Only Dashboard</p>
              <p className="text-sm text-blue-700 mt-1">
                This dashboard provides informational insights only. No content access, no edit, no publish, no rewrite.
                All data is anonymized and normalized for cross-brand/locale comparison.
              </p>
            </div>
          </div>
        </div>

        {/* Insights Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border">
          <Suspense fallback={<LoadingSkeleton />}>
            <InsightsDashboard 
              currentBrandId={admin?.brandId || undefined}
            />
          </Suspense>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('❌ [InsightsPage] Error:', error);
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
