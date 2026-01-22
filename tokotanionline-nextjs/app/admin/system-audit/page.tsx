import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SystemAuditClient from '@/components/admin/SystemAuditClient';

export default async function SystemAuditPage() {
  const session = await getServerSession();
  
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <SystemAuditClient />
  );
}







