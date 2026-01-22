/**
 * STEP P1-3A - UNIFIED AUDIT TRAIL PAGE
 * 
 * Read-only audit trail untuk semua aktivitas sistem
 * Owner-friendly, human-readable
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AuditTimeline from '@/components/admin/AuditTimeline';
import { assertPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default async function AuditPage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/admin/login');
  }

  // 🔒 GUARD: Permission check
  const userRole = (session.user as any).role;
  try {
    assertPermission(userRole, 'system.view');
  } catch (error: any) {
    redirect('/admin/login');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
        <p className="text-gray-600">
          Riwayat lengkap semua aktivitas sistem: admin actions, engine decisions, marketing events, dan perubahan sistem.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Semua aktivitas dicatat untuk keperluan audit dan observability. Data ini read-only dan tidak dapat diubah.
        </p>
      </div>

      <Suspense fallback={<TimelineSkeleton />}>
        <AuditTimeline />
      </Suspense>
    </div>
  );
}






