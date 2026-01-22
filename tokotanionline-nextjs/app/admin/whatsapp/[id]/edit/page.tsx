import WhatsAppFormClient from '@/components/admin/WhatsAppFormClient';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function EditWhatsAppPage({ params }: { params: { id: string } }) {
  const admin = await prisma.whatsAppAdmin.findUnique({
    where: { id: params.id },
  });

  if (!admin) {
    notFound();
  }

  return (
    <WhatsAppFormClient admin={JSON.parse(JSON.stringify(admin))} />
  );
}



