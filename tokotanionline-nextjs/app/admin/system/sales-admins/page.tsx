/**
 * FASE F5 — F5-A: SALES ADMIN MANAGEMENT (UI)
 * 
 * Page: /admin/system/sales-admins
 * 
 * Fungsi: Sales Admin CRUD UI
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
import SalesAdminListClient from '@/components/admin/SalesAdminListClient';

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

export default async function SalesAdminManagementPage() {
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
          Sales Admin Management
        </h1>
        <p className="text-gray-600 mt-2">
          Kelola sales admin yang menerima lead & rotasi penjualan
        </p>
      </div>

      {/* Sales Admin List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <Suspense fallback={<LoadingSkeleton />}>
          <SalesAdminListClient />
        </Suspense>
      </div>
    </div>
  );
}
