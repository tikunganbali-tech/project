/**
 * ENGINES PAGE - READ-ONLY MODE
 * 
 * UI hanya membaca dari NOTE layer
 * Tidak ada trigger engine
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NoteLayerMonitor from '@/components/admin/NoteLayerMonitor';

export default async function EnginesPage() {
  const session = await getServerSession();
  
  if (!session || (session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return <NoteLayerMonitor />;
}
