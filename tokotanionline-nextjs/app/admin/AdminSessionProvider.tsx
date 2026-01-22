'use client';

/**
 * FASE 1 — ADMIN SESSION PROVIDER
 * 
 * Tujuan: Menyediakan SessionProvider untuk semua halaman admin
 * 
 * Aturan:
 * - Hanya digunakan di admin layout
 * - Tidak digunakan di root layout
 * - Tidak conditional
 */

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function AdminSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
