import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImageAPIKeysClient from '@/components/admin/ImageAPIKeysClient';

export default async function ImageAPIKeysPage() {
  const session = await getServerSession();

  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <ImageAPIKeysClient />
      </div>
    </div>
  );
}

















