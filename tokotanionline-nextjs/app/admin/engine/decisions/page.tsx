/**
 * STEP P1-3B - ENGINE DECISION INSPECTOR PAGE
 * 
 * Read-only decision inspector untuk menjawab "KENAPA"
 * Owner-friendly, non-technical language
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import DecisionTimeline from '@/components/admin/DecisionTimeline';
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

export default async function EngineDecisionsPage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/admin/login');
  }

  // 🔒 GUARD: Permission check
  const userRole = (session.user as any).role;
  try {
    assertPermission(userRole, 'engine.view');
  } catch (error: any) {
    redirect('/admin/login');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Engine Decision Inspector</h1>
        <p className="text-gray-600">
          Menjelaskan <strong>kenapa</strong> event dikirim atau tidak dikirim ke platform marketing.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Tool ini menjawab pertanyaan "KENAPA" bukan "APA". Semua informasi read-only dan tidak memicu eksekusi apapun.
        </p>
      </div>

      <Suspense fallback={<TimelineSkeleton />}>
        <DecisionTimeline />
      </Suspense>
    </div>
  );
}
