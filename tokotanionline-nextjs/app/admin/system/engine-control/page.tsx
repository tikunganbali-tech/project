/**
 * ENGINE CONTROL CENTER - UI Page
 * 
 * Page: /admin/system/engine-control
 * 
 * Global cockpit for engine state management
 */

import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import EngineControlClient from '@/components/admin/EngineControlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="bg-white border rounded-lg p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default async function EngineControlPage() {
  // 🔒 GUARD: AUTHENTICATION CHECK
  const session = await getServerSession();
  
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  // 🔒 GUARD: PERMISSION CHECK (engine.view minimum, engine.control for toggle)
  const userRole = (session.user as any).role;
  const canView = hasPermission(userRole, 'engine.view');

  if (!canView) {
    redirect('/admin');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Engine Control Center
        </h1>
        <p className="text-gray-600 mt-2">
          Manage AI Engine, SEO Engine, and Scheduler status
        </p>
      </div>

      {/* Engine Control Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <EngineControlClient />
      </Suspense>
    </div>
  );
}
