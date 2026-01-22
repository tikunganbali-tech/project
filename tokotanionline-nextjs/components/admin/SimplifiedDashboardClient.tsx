/**
 * Simplified Admin Dashboard
 * E2: TOTAL ENGINE ISOLATION - Safe mode only
 * UI hanya render safe shell, tidak ada engine dependency
 */

'use client';

import { lazy, Suspense } from 'react';
import { RefreshCw } from 'lucide-react';

const ADMIN_SAFE_MODE = true;

// Lazy load components (E2.1: Safe shells only, no engine dependency)
const BuyerIntentPages = lazy(() => import('./dashboard/BuyerIntentPages'));
const RevenuePath = lazy(() => import('./dashboard/RevenuePath'));
const TopCities = lazy(() => import('./dashboard/TopCities'));

export default function SimplifiedDashboardClient() {
  // E2.4: ADMIN SAFE MODE - Degraded-first approach
  // UI hanya render safe shell, tidak pernah menunggu engine
  if (!ADMIN_SAFE_MODE) {
    // Fallback jika safe mode tidak aktif (should not happen in E2)
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Admin Safe Mode is disabled. Please enable ADMIN_SAFE_MODE in lib/config/runtime.ts
          </p>
        </div>
      </div>
    );
  }

  // E2.2: HAPUS SEMUA ENGINE LOGIC - UI HANYA RENDER SAFE SHELL
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Decision Dashboard</h1>
          <p className="text-gray-600 mt-1">Actionable insights for revenue growth</p>
        </div>
      </div>

      {/* Buyer Intent Pages - SAFE SHELL */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow p-6 animate-pulse h-64 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }>
        <BuyerIntentPages />
      </Suspense>

      {/* Revenue Path - SAFE SHELL */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow p-6 animate-pulse h-48 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }>
        <RevenuePath />
      </Suspense>

      {/* Top Cities - SAFE SHELL */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow p-6 animate-pulse h-64 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }>
        <TopCities />
      </Suspense>

    </div>
  );
}

