/**
 * PHASE 8B.5: Strategy Brief Admin Page (READ-ONLY)
 * 
 * Admin review & approve new version production.
 * NO manual text edit, NO auto-publish.
 */

import { enforceAdminPageGuard } from '@/lib/admin-page-guard';
import StrategyBriefClient from '@/components/admin/StrategyBriefClient';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function LoadingSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
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

export default async function StrategyBriefPage() {
  // EKSEKUSI 4: Use enforceAdminPageGuard for consistent auth
  await enforceAdminPageGuard({
    requireRole: 'admin', // Admin or super_admin
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Content Strategy Brief</h1>
        <p className="text-sm text-gray-600">
          PHASE 8B: Review strategy briefs from SEO + Ads insights. Approve new version production.
          Tidak ada manual text edit, tidak ada auto-publish.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <StrategyBriefClient />
      </Suspense>
    </div>
  );
}
