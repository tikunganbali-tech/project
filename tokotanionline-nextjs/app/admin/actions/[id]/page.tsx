import ActionDetailClient from '@/components/admin/ActionDetailClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

export default async function ActionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  const action = await prisma.actionApproval.findUnique({
    where: { id: params.id },
    include: {
      traces: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!action) {
    notFound();
  }

  return (
    <ActionDetailClient action={JSON.parse(JSON.stringify(action))} />
  );
}

