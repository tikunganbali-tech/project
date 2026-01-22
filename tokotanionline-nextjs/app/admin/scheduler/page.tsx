/**
 * PHASE UI-A — SCHEDULER DASHBOARD PAGE
 * 
 * Admin page untuk scheduler control panel
 */

import SchedulerDashboardClient from '@/components/admin/SchedulerDashboardClient';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SchedulerPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  return <SchedulerDashboardClient />;
}
