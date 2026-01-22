import WhatsAppManagerClient from '@/components/admin/WhatsAppManagerClient';
import { prisma } from '@/lib/db';

export default async function WhatsAppPage() {
  const admins = await prisma.whatsAppAdmin.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <WhatsAppManagerClient admins={JSON.parse(JSON.stringify(admins))} />
  );
}
