/**
 * FASE 1 — ADMIN LAYOUT (ROOT)
 * 
 * KONTRAK TEKNIS:
 * - Client component wrapper untuk AdminLayoutClient
 * - SessionProvider dipasang di sini (AdminSessionProvider)
 * - NO auth check (middleware handles)
 * - NO redirect (middleware handles)
 * - Skip untuk /admin/login (no sidebar)
 * - Pure wrapper component
 */

'use client';

import { usePathname } from 'next/navigation';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';
import AdminSessionProvider from './AdminSessionProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';
  
  // FASE 1: Skip AdminLayoutClient untuk login page (no sidebar, no SessionProvider)
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // FASE 1: Untuk route admin lainnya, wrap dengan SessionProvider dan AdminLayoutClient
  return (
    <AdminSessionProvider>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </AdminSessionProvider>
  );
}
