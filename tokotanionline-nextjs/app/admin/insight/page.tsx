import InsightKpiStrip from '@/components/admin/InsightKpiStrip';
import InsightCards from '@/components/admin/InsightCards';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export default async function InsightPage() {
  // 🔒 SECURITY: Use consistent guard (fix auth redirect issue)
  const { enforceAdminPageGuard } = await import('@/lib/admin-page-guard');
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'admin',
  });

  // If guard requires redirect, enforceAdminPageGuard will handle it automatically
  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Insight & Analitik</h1>
        <p className="text-sm text-gray-600">
          Ringkasan performa produk, konten, dan interaksi pengunjung untuk pengambilan keputusan
        </p>
      </div>

      {/* KPI Strip */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Ringkasan Angka</h2>
        <Suspense fallback={<KpiStripSkeleton />}>
          <InsightKpiStrip />
        </Suspense>
      </section>

      {/* Insight Cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Insight & Saran</h2>
        <Suspense fallback={<CardsSkeleton />}>
          <InsightCards />
        </Suspense>
      </section>
    </div>
  );
}
