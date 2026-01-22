'use client';

/**
 * R5-FINAL BLOK A2 — AUTH CLIENT ISOLATION (HARD DISABLE)
 * 
 * Status: DIPUTUS DARI SESSION API
 * 
 * Catatan penting:
 * - File tetap ada
 * - Import tetap ada (di AdminLayoutClient)
 * - Tidak dihapus
 * - Tapi NO CLIENT-SIDE SESSION FETCHING
 * 
 * Tujuan: Runtime TENANG
 * - Tidak ada useSession()
 * - Tidak ada fetch ke /api/auth/session dari client
 * - Admin tetap aman (server-side auth di pages)
 * - Client tidak parsing JSON kosong
 * 
 * Komponen yang perlu user info:
 * - Gunakan server-side auth (getServerSession di pages)
 * - Pass data via props dari server components
 * - Gunakan server actions
 */

import { createContext, useContext, ReactNode } from 'react';
import { getCapabilities, SAFE_MODE, type RoleCapabilities } from '@/lib/admin-config';

interface AdminContextType {
  capabilities: RoleCapabilities;
  safeMode: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  // R5-FINAL A2: No user data, no session fetching
  // Default capabilities (config-based only, no role-based since no user data)
  const capabilities = getCapabilities(null);

  return (
    <AdminContext.Provider
      value={{
        capabilities,
        safeMode: SAFE_MODE,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}







