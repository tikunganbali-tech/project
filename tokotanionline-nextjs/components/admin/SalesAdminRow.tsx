/**
 * FASE F5 — F5-A: SALES ADMIN MANAGEMENT (UI)
 * 
 * Component: SalesAdminRow
 * 
 * Fungsi: Menampilkan satu row sales admin dengan actions
 */

'use client';

import { useState } from 'react';
import EditSalesAdminModal from './EditSalesAdminModal';

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

interface SalesAdminRowProps {
  admin: SalesAdmin;
  canWrite: boolean;
  onUpdate: () => void;
}

export default function SalesAdminRow({
  admin,
  canWrite,
  onUpdate,
}: SalesAdminRowProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Get available channels
  const getChannels = (): string[] => {
    const channels: string[] = [];
    if (admin.whatsapp) channels.push('WA');
    if (admin.shopeeLink) channels.push('Shopee');
    if (admin.tokopediaLink) channels.push('Tokopedia');
    return channels;
  };

  const channels = getChannels();

  // Handle delete
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${admin.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/sales-admins/${admin.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete sales admin');
        return;
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting sales admin:', error);
      alert('Failed to delete sales admin');
    } finally {
      setDeleting(false);
    }
  };

  // Format WhatsApp number for display
  const formatWhatsApp = (phone: string) => {
    // Format: 6281234567890 -> +62 812-3456-7890
    if (phone.startsWith('62')) {
      const rest = phone.substring(2);
      return `+62 ${rest.substring(0, rest.length - 4)}-${rest.substring(rest.length - 4)}`;
    }
    return phone;
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        {/* Name */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm font-medium text-gray-900">
            {admin.name}
          </span>
        </td>

        {/* Status */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              admin.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {admin.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>

        {/* Sort Order */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm text-gray-900">{admin.sortOrder}</span>
          <span className="text-xs text-gray-500 ml-1">
            (lower = higher priority)
          </span>
        </td>

        {/* Channels */}
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1">
            {channels.length > 0 ? (
              channels.map((channel) => (
                <span
                  key={channel}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {channel}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No channels</span>
            )}
          </div>
        </td>

        {/* WhatsApp */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm text-gray-900">
            {formatWhatsApp(admin.whatsapp)}
          </span>
        </td>

        {/* Click Count */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm text-gray-900">{admin.clickCount}</span>
        </td>

        {/* Actions */}
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center gap-2">
            {canWrite && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  title="Delete"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Edit Modal */}
      {showEditModal && (
        <EditSalesAdminModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
          admin={admin}
        />
      )}
    </>
  );
}
