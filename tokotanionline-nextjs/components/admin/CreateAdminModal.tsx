/**
 * STEP 24B-2 — ADMIN USER MANAGEMENT (UI)
 * 
 * Component: CreateAdminModal
 * 
 * Fungsi: Modal untuk create admin user
 * 
 * Prinsip:
 * - UI hanya menampilkan form
 * - Backend yang memutuskan boleh/tidak
 * - Tidak ada password field (di-handle via invite/reset flow)
 */

'use client';

import { useState } from 'react';
import { type AdminRole } from '@/lib/permissions';

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userIsSuperAdmin: boolean;
}

export default function CreateAdminModal({
  isOpen,
  onClose,
  onSuccess,
  userIsSuperAdmin,
}: CreateAdminModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as AdminRole,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ ROLE OPTIONS
  // super_admin hanya muncul jika current user = super_admin
  const roleOptions: { value: AdminRole; label: string }[] = [
    { value: 'viewer', label: 'Viewer (Read-only)' },
    { value: 'admin', label: 'Admin (Manage data)' },
    ...(userIsSuperAdmin
      ? [{ value: 'super_admin' as AdminRole, label: 'Super Admin (Full access)' }]
      : []),
  ];

  // 📝 HANDLE SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create admin');
        return;
      }

      // Success
      setFormData({ name: '', email: '', role: 'admin' });
      onSuccess();
    } catch (err: any) {
      console.error('Error creating admin:', err);
      setError('Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RESET ON CLOSE
  const handleClose = () => {
    setFormData({ name: '', email: '', role: 'admin' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Admin User</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as AdminRole })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> User akan mengatur password melalui email reset flow.
            </p>
          </div>

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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
