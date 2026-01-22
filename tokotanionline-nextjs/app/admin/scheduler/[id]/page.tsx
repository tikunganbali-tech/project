/**
 * PHASE UI-A: Edit Schedule Page
 */

import SchedulerFormClient from '@/components/admin/SchedulerFormClient';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditSchedulerPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  const schedule = await prisma.contentSchedule.findUnique({
    where: { id: params.id },
  });

  if (!schedule) {
    notFound();
  }

  return <SchedulerFormClient schedule={JSON.parse(JSON.stringify(schedule))} />;
}
