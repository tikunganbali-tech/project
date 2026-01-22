/**
 * PHASE 3.3.1 — GLOBAL WEBSITE SETTINGS (ADMIN UI)
 * 
 * Page: /admin/system/website
 * 
 * Fungsi: Website Settings Management UI
 * 
 * Prinsip:
 * - UI = PRESENTATION ONLY
 * - Tidak ada keputusan di UI
 * - Semua izin diputuskan backend
 */

import { Suspense } from 'react';
import WebsiteSettingsClient from '@/components/admin/WebsiteSettingsClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Force Next.js to detect this route

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="bg-white border rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default async function WebsiteSettingsPage() {
  try {
    // 🔒 GUARD: Check with dev mode support
    const guardResult = await enforceAdminPageGuard({
      requireAuth: true,
      requirePermission: 'system.view',
      devModeStatus: 'read-only',
      devModeNote: 'Website settings are available in read-only mode during development.',
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
            Website Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola identitas website, homepage, dan halaman statis
          </p>
        </div>

        {/* Settings Content */}
        <Suspense fallback={<LoadingSkeleton />}>
          <WebsiteSettingsClient />
        </Suspense>
      </div>
    );
  } catch (error: any) {
    console.error('❌ [WebsiteSettingsPage] Error:', error);
    // Return error UI instead of crashing
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
