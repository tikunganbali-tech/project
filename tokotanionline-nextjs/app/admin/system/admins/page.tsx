/**
 * STEP 24B-2 — ADMIN USER MANAGEMENT (UI)
 * 
 * Page: /admin/system/admins
 * 
 * Fungsi: Admin & Role Management UI
 * 
 * Prinsip:
 * - UI = PRESENTATION ONLY
 * - Tidak ada keputusan di UI
 * - Semua izin diputuskan backend
 * - UI hanya menampilkan, memanggil API, dan menyembunyikan aksi
 */

import { Suspense } from 'react';
import AdminListClient from '@/components/admin/AdminListClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="border rounded-lg">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminManagementPage() {
  // 🔒 GUARD: Check with dev mode support
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'system.view',
    devModeStatus: 'read-only',
    devModeNote: 'Admin management is available in read-only mode during development.',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Admin & Role Management
        </h1>
        <p className="text-gray-600 mt-2">
          Kelola admin users dan role assignments
        </p>
      </div>      {/* Admin List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminListClient />
        </Suspense>
      </div>
    </div>
  );
}
