/**
 * PHASE 8C.6: Growth Insight Admin Dashboard (READ-ONLY)
 * 
 * Tampilkan: tren lintas channel, indeks performa, ringkasan opportunity/risk
 * ❌ Tidak ada tombol edit / publish / trigger
 */

import GrowthInsightClient from '@/components/admin/GrowthInsightClient';
import { Suspense } from 'react';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

function LoadingSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function GrowthInsightPage() {
  // 🔒 SECURITY: Use consistent guard pattern
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Growth Insight</h1>
        <p className="text-sm text-gray-600">
          PHASE 8C: Cross-channel growth insight dari SEO + Ads + Analytics.
          Read-only dashboard. Tidak ada edit, publish, atau trigger buttons.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <GrowthInsightClient />
      </Suspense>
    </div>
  );
}
