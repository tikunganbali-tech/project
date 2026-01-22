/**
 * Smart Ad Set - Admin Page
 */

import SmartAdSetClient from '@/components/admin/SmartAdSetClient';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SmartAdSetPage() {
  const session = await getServerSession();
  
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <SmartAdSetClient />
  );
}














