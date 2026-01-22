'use client'

/**
 * FASE 1 — ADMIN LAYOUT CLIENT
 * 
 * Catatan penting:
 * - SessionProvider dipasang di AdminSessionProvider (app/admin/AdminSessionProvider.tsx)
 * - AdminProvider menggunakan context untuk capabilities
 * - Client components bisa menggunakan useSession() tanpa error
 */

import { ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import Sidebar from '@/components/admin/Sidebar'
import BrandSelector from '@/components/admin/BrandSelector'
import LanguageSelector from '@/components/admin/LanguageSelector'
import { AdminProvider, useAdmin } from '@/components/providers/AdminProvider'
import { SAFE_MODE, FEATURE_FREEZE } from '@/lib/admin-config'
import { NotificationProvider, NotificationIcon, NotificationPopup } from '@/lib/notification-context'
import EngineAccessIndicator from '@/components/admin/EngineAccessIndicator'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { safeMode } = useAdmin()
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin logout?')) {
      await signOut({ 
        redirect: false,
        callbackUrl: '/admin/login'
      })
      router.push('/admin/login')
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-col">
        {/* PHASE 7A: Brand Selector */}
        <BrandSelector />
        {/* PHASE 7B: Language Selector */}
        <LanguageSelector />
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        {/* Header with SAFE MODE and FEATURE FREEZE indicators */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {FEATURE_FREEZE && (
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold border border-blue-300">
                🔒 System in Production Freeze
              </span>
            )}
            {safeMode && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold">
                SAFE MODE
              </span>
            )}
          </div>
          {session && (
            <div className="flex items-center gap-3">
              {/* Global Engine Access Indicator */}
              <EngineAccessIndicator />
              {/* Notification Icon (untuk background processes) */}
              <NotificationIcon />
              <span className="text-sm text-gray-600">
                {(session.user as any)?.name || (session.user as any)?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
        {/* Feature Freeze Banner */}
        {/* R5-FINAL A2: No isSuperAdmin check - banner removed (server-side auth handles permissions) */}
        <div className="p-6">
          {children}
        </div>
      </main>
      {/* Notification Popup (untuk real-time notifications) */}
      <NotificationPopup />
    </div>
  )
}

export default function AdminLayoutClient({
  children
}: {
  children: ReactNode
}) {
  // FASE 1: AdminProvider tidak perlu SessionProvider di sini
  // SessionProvider sudah dipasang di AdminSessionProvider (app/admin/layout.tsx)
  return (
    <NotificationProvider>
      <AdminProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminProvider>
    </NotificationProvider>
  )
}
