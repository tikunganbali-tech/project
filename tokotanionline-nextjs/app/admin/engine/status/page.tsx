/**
 * FASE 2 — ENGINE STATUS PAGE
 * 
 * Monitoring engine status & manual trigger
 * - Read-only status display
 * - Manual run button (super_admin only)
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EngineStatusClient from '@/components/admin/EngineStatusClient';

export const dynamic = 'force-dynamic';

export default async function EngineStatusPage() {
  const session = await getServerSession();
  
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Engine Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          FASE 2 — Engine Visibility • Status monitoring & manual control
        </p>
      </div>

      <EngineStatusClient />
    </div>
  );
}

