import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LocationManagerClient from '@/components/admin/LocationManagerClient';

export default async function LocationsPage() {
  const session = await getServerSession();
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <LocationManagerClient />
  );
}

















