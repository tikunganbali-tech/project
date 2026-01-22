/**
 * PHASE UI-A: Create Schedule Page
 */

import SchedulerFormClient from '@/components/admin/SchedulerFormClient';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewSchedulerPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  return <SchedulerFormClient />;
}
