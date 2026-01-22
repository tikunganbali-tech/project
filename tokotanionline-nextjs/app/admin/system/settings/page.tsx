/**
 * STEP 24C — SYSTEM SETTINGS (GLOBAL CONFIG & SAFETY)
 * 
 * Page: /admin/system/settings
 * 
 * Fungsi: System Settings Management UI
 * 
 * Prinsip:
 * - UI = PRESENTATION ONLY
 * - Tidak ada keputusan di UI
 * - Semua izin diputuskan backend
 */

import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import SystemSettingsClient from '@/components/admin/SystemSettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SystemSettingsPage() {
  // 🔒 GUARD: AUTHENTICATION CHECK
  const session = await getServerSession();
  
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  // 🔒 GUARD: PERMISSION CHECK
  const userRole = (session.user as any).role;
  const canView = hasPermission(userRole, 'system.view');

  if (!canView) {
    redirect('/admin');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          System Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage system-wide configuration and safety flags
        </p>
      </div>      {/* Settings Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <SystemSettingsClient />
      </Suspense>
    </div>
  );
}
