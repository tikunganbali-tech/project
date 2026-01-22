'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  BookOpen,
  BarChart3,
  Activity,
  Cpu,
  ListChecks,
  ScrollText,
  Brain,
  Users,
  Settings,
  Globe,
  Plug,
  UserCog,
  Calendar,
  MousePointerClick,
  Image,
  Megaphone,
  FileText,
  Search,
  Heart,
  Monitor
} from 'lucide-react'

type MenuItem = {
  label: string
  href: string
  icon: any
  status?: 'active' | 'read-only' | 'coming-soon'
}

// REALITY ALIGNMENT: Hanya tampilkan menu yang bisa dipakai sekarang
// - Tidak read-only
// - Tidak butuh engine aktif
// - Tidak role khusus (kecuali admin)
const sections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'CORE',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, status: 'active' },
      { label: 'Produk', href: '/admin/products', icon: Package, status: 'active' },
      { label: 'Kategori', href: '/admin/categories', icon: FolderTree, status: 'active' },
      { label: 'Konten (Blog)', href: '/admin/blog/posts', icon: BookOpen, status: 'active' },
      { label: 'Admin & Role', href: '/admin/system/admins', icon: Users, status: 'active' }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Engine Control', href: '/admin/system/engine-control', icon: Cpu, status: 'active' }
    ]
  }
]

export default function Sidebar() {
  // Next.js types can mark pathname as nullable in some render paths
  const pathname = usePathname() ?? ''

  return (
    <aside className="w-64 border-r bg-white h-screen overflow-y-auto px-4 py-6">
      {sections.map(section => (
        <div key={section.title} className="mb-6">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map(item => {
              // Match exact path or nested routes (e.g., /admin/blog/posts matches /admin/blog/posts/new)
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              const status = item.status || 'active'
              
              // Status badge styling
              const getStatusBadge = () => {
                if (status === 'read-only') {
                  return (
                    <span 
                      className="ml-auto text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                      title="Read-only: View only, no actions available"
                    >
                      READ
                    </span>
                  )
                }
                if (status === 'coming-soon') {
                  return (
                    <span 
                      className="ml-auto text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded"
                      title="Coming Soon: Feature not yet available"
                    >
                      SOON
                    </span>
                  )
                }
                return null
              }
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                      ${
                        active
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                      ${status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                    onClick={(e) => {
                      if (status === 'coming-soon') {
                        e.preventDefault()
                      }
                    }}
                    title={
                      status === 'read-only' 
                        ? 'Read-only: View only, no actions available'
                        : status === 'coming-soon'
                        ? 'Coming Soon: Feature not yet available'
                        : undefined
                    }
                  >
                    <Icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    {getStatusBadge()}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}
