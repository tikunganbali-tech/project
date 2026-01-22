/**
 * STEP 24B-2 — ADMIN USER MANAGEMENT (UI)
 * 
 * Component: ChangeRoleModal
 * 
 * Fungsi: Modal untuk change role admin
 * 
 * Prinsip:
 * - UI tidak bisa ubah role sendiri
 * - Warning eksplisit tentang konsekuensi
 * - Backend yang memutuskan boleh/tidak
 */

'use client';

import { useState } from 'react';
import { type AdminRole } from '@/lib/permissions';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admin: Admin;
  currentUserId: string | undefined;
}

export default function ChangeRoleModal({
  isOpen,
  onClose,
  onSuccess,
  admin,
  currentUserId,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<AdminRole>(admin.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 SELF-CHANGE PROTECTION (UI level)
  const isSelf = currentUserId === admin.id;

  // ✅ ROLE OPTIONS
  const roleOptions: { value: AdminRole; label: string; description: string }[] = [
    {
      value: 'viewer',
      label: 'Viewer',
      description: 'Read-only access. Cannot modify data or execute actions.',
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Can manage data but cannot execute critical actions or change roles.',
    },
    {
      value: 'super_admin',
      label: 'Super Admin',
      description: 'Full access including role management and system execution.',
    },
  ];

  // 📝 HANDLE SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === admin.role) {
      setError('Please select a different role');
      return;
    }

    // 🔒 UI LEVEL CHECK (tambahan dari backend)
    if (isSelf) {
      setError('Cannot change your own role');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/system/admins/${admin.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change role');
        return;
      }

      // Success
      onSuccess();
    } catch (err: any) {
      console.error('Error changing role:', err);
      setError('Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RESET ON CLOSE
  const handleClose = () => {
    setSelectedRole(admin.role);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Change Role</h2>
          <p className="text-sm text-gray-500 mt-1">{admin.name} ({admin.email})</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Role
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{admin.role}</span>
            </div>
          </div>

          {/* New Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Role *
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading || isSelf}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {roleOptions.find((opt) => opt.value === selectedRole) && (
              <p className="mt-1 text-xs text-gray-500">
                {roleOptions.find((opt) => opt.value === selectedRole)?.description}
              </p>
            )}
          </div>

          {/* ⚠️ WARNING */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Perubahan role berdampak pada akses sistem. Pastikan
              role yang dipilih sesuai dengan kebutuhan.
            </p>
          </div>

          {/* ❌ SELF-CHANGE MESSAGE */}
          {isSelf && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>❌ Tidak bisa:</strong> Anda tidak dapat mengubah role sendiri.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isSelf || selectedRole === admin.role}
            >
              {loading ? 'Changing...' : 'Change Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
