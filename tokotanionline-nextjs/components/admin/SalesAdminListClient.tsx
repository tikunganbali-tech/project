/**
 * FASE F5 — F5-A: SALES ADMIN MANAGEMENT (UI)
 * 
 * Component: SalesAdminListClient
 * 
 * Fungsi: Menampilkan daftar sales admin dengan CRUD operations
 * 
 * Prinsip:
 * - UI hanya menampilkan berdasarkan permission
 * - Tidak ada keputusan di UI
 * - Semua aksi dipanggil ke backend API
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import SalesAdminRow from './SalesAdminRow';
import CreateSalesAdminModal from './CreateSalesAdminModal';

interface SalesAdmin {
  id: string;
  name: string;
  whatsapp: string;
  shopeeLink: string | null;
  tokopediaLink: string | null;
  isActive: boolean;
  activeHours: string | null;
  clickCount: number;
  lastUsed: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function SalesAdminListClient() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<SalesAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userRole = (session?.user as any)?.role;

  // ✅ PERMISSION CHECKS
  const canView = hasPermission(userRole, 'system.view');
  const canWrite = hasPermission(userRole, 'system.manage');
  const canCreate = canWrite;

  // 📥 FETCH SALES ADMINS
  useEffect(() => {
    if (!canView) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    async function fetchAdmins() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/sales-admins');
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('Forbidden: Insufficient permissions');
          } else if (response.status === 401) {
            setError('Unauthorized: Please login again');
          } else {
            setError('Failed to load sales admins');
          }
          return;
        }

        const data = await response.json();
        if (data.success && data.admins) {
          setAdmins(data.admins);
        } else {
          setError('Invalid response format');
        }
      } catch (err: any) {
        console.error('Error fetching sales admins:', err);
        setError('Failed to load sales admins');
      } finally {
        setLoading(false);
      }
    }

    fetchAdmins();
  }, [canView]);

  // 🔄 REFRESH FUNCTION
  const refreshAdmins = async () => {
    try {
      const response = await fetch('/api/admin/sales-admins');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.admins) {
          setAdmins(data.admins);
        }
      }
    } catch (err) {
      console.error('Error refreshing sales admins:', err);
    }
  };

  if (!canView) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  // Get available channels for each admin
  const getChannels = (admin: SalesAdmin): string[] => {
    const channels: string[] = [];
    if (admin.whatsapp) channels.push('WA');
    if (admin.shopeeLink) channels.push('Shopee');
    if (admin.tokopediaLink) channels.push('Tokopedia');
    return channels;
  };

  return (
    <div className="p-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Sales Admins ({admins.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage sales admins for lead distribution
          </p>
        </div>
        
        {/* ✅ CONDITIONAL RENDERING: Create button */}
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Create Sales Admin
          </button>
        )}
      </div>

      {/* Sales Admin Table */}
      {admins.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No sales admins found. Create one to start receiving leads.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urutan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <SalesAdminRow
                  key={admin.id}
                  admin={admin}
                  canWrite={canWrite}
                  onUpdate={refreshAdmins}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Sales Admin Modal */}
      {showCreateModal && (
        <CreateSalesAdminModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshAdmins();
          }}
        />
      )}
    </div>
  );
}
