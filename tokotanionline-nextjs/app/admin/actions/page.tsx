import ActionsManagerClient from '@/components/admin/ActionsManagerClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminActionsPage() {
  const session = await getServerSession();
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  const actions = await prisma.actionApproval.findMany({
    include: {
      traces: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <ActionsManagerClient actions={JSON.parse(JSON.stringify(actions))} />
  );
}

