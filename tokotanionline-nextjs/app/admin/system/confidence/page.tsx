/**
 * STEP P1-3C - SYSTEM CONFIDENCE PANEL PAGE
 * 
 * Owner-grade confidence panel
 * 100% observational, no actions
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SystemConfidenceClient from '@/components/admin/SystemConfidenceClient';
import { assertPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function ConfidenceSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow border p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export default async function SystemConfidencePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Confidence Panel</h1>
        <p className="text-gray-600">
          Panel kepercayaan untuk menjawab: <strong>"Apakah sistem saya aman, terkendali, dan bekerja sesuai aturan hari ini?"</strong>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Panel ini 100% observasional. Tidak ada trigger, write, atau engine control. Semua informasi read-only.
        </p>
      </div>

      <Suspense fallback={<ConfidenceSkeleton />}>
        <SystemConfidenceClient />
      </Suspense>
    </div>
  );
}
