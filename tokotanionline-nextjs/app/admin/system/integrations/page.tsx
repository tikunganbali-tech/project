/**
 * PHASE 6A — INTEGRATIONS CONFIGURATION (ADMIN UI)
 * 
 * Page: /admin/system/integrations
 * 
 * Fungsi: Admin-managed integration configuration
 * 
 * Prinsip:
 * - SUPER ADMIN can configure all integrations
 * - All secrets encrypted at-rest
 * - Real-time health checks
 * - No terminal/ENV required for runtime config
 */

import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import IntegrationsClient from '@/components/admin/IntegrationsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="border rounded-lg divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function IntegrationsPage() {
  try {
    // 🔒 GUARD: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      redirect('/admin/login');
    }

    // 🔒 GUARD: PERMISSION CHECK
    const userRole = (session.user as any)?.role;
    if (!userRole) {
      redirect('/admin/login');
    }

    const canView = hasPermission(userRole, 'system.view');

    if (!canView) {
      redirect('/admin');
    }

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            System Integrations
          </h1>
          <p className="text-gray-600 mt-2">
            Configure and manage system integrations securely via Admin Dashboard
          </p>
        </div>

        {/* Integrations List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <Suspense fallback={<LoadingSkeleton />}>
            <IntegrationsClient />
          </Suspense>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('❌ [IntegrationsPage] Error:', error);
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
