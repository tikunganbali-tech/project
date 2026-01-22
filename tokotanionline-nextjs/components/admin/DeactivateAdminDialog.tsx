/**
 * STEP 24B-2 — ADMIN USER MANAGEMENT (UI)
 * 
 * Component: DeactivateAdminDialog
 * 
 * Fungsi: Dialog untuk activate/deactivate admin
 * 
 * Prinsip:
 * - UI tidak bisa disable diri sendiri
 * - Jika admin terakhir → tombol tidak muncul (di AdminRow)
 * - Pesan non-teknis, jelas konsekuensi
 * - Backend yang memutuskan boleh/tidak
 */

'use client';

import { useState } from 'react';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeactivateAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admin: Admin;
  currentUserId: string | undefined;
}

export default function DeactivateAdminDialog({
  isOpen,
  onClose,
  onSuccess,
  admin,
  currentUserId,
}: DeactivateAdminDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 SELF-DISABLE PROTECTION (UI level)
  const isSelf = currentUserId === admin.id;
  const action = admin.isActive ? 'deactivate' : 'activate';
  const actionLabel = admin.isActive ? 'Deactivate' : 'Activate';

  // 📝 HANDLE SUBMIT
  const handleSubmit = async () => {
    setError(null);

    // 🔒 UI LEVEL CHECK (tambahan dari backend)
    if (isSelf && admin.isActive) {
      setError('Cannot deactivate yourself');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/system/admins/${admin.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to ${action} admin`);
        return;
      }

      // Success
      onSuccess();
    } catch (err: any) {
      console.error(`Error ${action}ing admin:`, err);
      setError(`Failed to ${action} admin`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RESET ON CLOSE
  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {actionLabel} Admin User
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Admin Info */}
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Admin:</strong> {admin.name} ({admin.email})
            </p>
            <p className="text-sm text-gray-600">
              <strong>Role:</strong> {admin.role}
            </p>
          </div>

          {/* ⚠️ WARNING MESSAGES */}
          {admin.isActive ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Konsekuensi:</strong> Admin ini akan kehilangan akses ke sistem.
                Mereka tidak akan bisa login sampai diaktifkan kembali.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>✅ Konsekuensi:</strong> Admin ini akan mendapatkan akses kembali ke sistem.
                Mereka bisa login setelah diaktifkan.
              </p>
            </div>
          )}

          {/* ❌ SELF-DISABLE MESSAGE */}
          {isSelf && admin.isActive && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>❌ Tidak bisa:</strong> Anda tidak dapat menonaktifkan diri sendiri.
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
              type="button"
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                admin.isActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              disabled={loading || (isSelf && admin.isActive)}
            >
              {loading ? `${actionLabel}ing...` : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
