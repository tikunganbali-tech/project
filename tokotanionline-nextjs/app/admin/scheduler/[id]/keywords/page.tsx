/**
 * PHASE UI-A: Keywords Management Page
 */

import SchedulerKeywordsClient from '@/components/admin/SchedulerKeywordsClient';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SchedulerKeywordsPage({
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
    select: {
      id: true,
      name: true,
    },
  });

  if (!schedule) {
    notFound();
  }

  return (
    <SchedulerKeywordsClient
      scheduleId={schedule.id}
      scheduleName={schedule.name}
    />
  );
}
