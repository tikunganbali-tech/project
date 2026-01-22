import ActivityTimeline from '@/components/admin/ActivityTimeline';
import { Suspense } from 'react';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse border-l-4 border-gray-300">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default async function ActivityPage() {
  // 🔒 SECURITY: Check authentication and permissions using guard
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin', // admin or super_admin (checked in guard)
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Aktivitas & Audit Trail</h1>
        <p className="text-sm text-gray-600">
          Riwayat aktivitas sistem, konten, produk, dan engine untuk audit trail
        </p>
      </div>

      {/* Activity Timeline */}
      <section>
        <Suspense fallback={<TimelineSkeleton />}>
          <ActivityTimeline />
        </Suspense>
      </section>
    </div>
  );
}
