import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SlugManagementClient from '@/components/admin/SlugManagementClient';

export default async function SlugManagementPage() {
  const session = await getServerSession();

  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <SlugManagementClient />
      </div>
    </div>
  );
}

















