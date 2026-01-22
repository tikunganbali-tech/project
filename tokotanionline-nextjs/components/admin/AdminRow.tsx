/**
 * STEP 24B-2 — ADMIN USER MANAGEMENT (UI)
 * 
 * Component: AdminRow
 * 
 * Fungsi: Menampilkan satu row admin dengan conditional actions
 * 
 * Prinsip:
 * - UI hanya menampilkan berdasarkan permission
 * - Tidak ada self-edit/self-disable di UI
 * - Semua aksi dipanggil ke backend API
 */

'use client';

import { useState } from 'react';
import { hasPermission, isSuperAdmin, type AdminRole } from '@/lib/permissions';
import ChangeRoleModal from './ChangeRoleModal';
import DeactivateAdminDialog from './DeactivateAdminDialog';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin: string | null; // PHASE 4.1: Last login timestamp
  createdAt: string;
  updatedAt: string;
}

interface AdminRowProps {
  admin: Admin;
  currentUserId: string | undefined;
  canWrite: boolean;
  userIsSuperAdmin: boolean;
  onUpdate: () => void;
}

export default function AdminRow({
  admin,
  currentUserId,
  canWrite,
  userIsSuperAdmin,
  onUpdate,
}: AdminRowProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(admin.name);
  const [updating, setUpdating] = useState(false);

  // ✅ PERMISSION CHECKS
  const canEditName = canWrite;
  const canChangeRole = canWrite && userIsSuperAdmin;
  const canDeactivate = canWrite;

  // 🔒 SELF-CHANGE PROTECTION (UI level)
  const isSelf = currentUserId === admin.id;
  const canEditSelfName = canEditName && isSelf; // Boleh edit nama sendiri
  const canEditSelfRole = false; // ❌ TIDAK BISA ubah role sendiri
  const canDeactivateSelf = false; // ❌ TIDAK BISA disable sendiri

  // 🎨 ROLE BADGE COLORS
  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 📝 UPDATE NAME
  const handleUpdateName = async () => {
    if (!nameValue.trim() || nameValue === admin.name) {
      setIsEditingName(false);
      setNameValue(admin.name);
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/system/admins/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to update name');
        setNameValue(admin.name);
        return;
      }

      setIsEditingName(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name');
      setNameValue(admin.name);
    } finally {
      setUpdating(false);
    }
  };

  // 📅 FORMAT DATE
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        {/* Name */}
        <td className="px-6 py-4 whitespace-nowrap">
          {isEditingName && canEditSelfName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName();
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setNameValue(admin.name);
                  }
                }}
                className="px-2 py-1 border rounded text-sm"
                disabled={updating}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900">
                {admin.name}
              </span>
              {canEditName && !isSelf && (
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setNameValue(admin.name);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  title="Edit name"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </td>

        {/* Email */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm text-gray-900">{admin.email}</span>
        </td>

        {/* Role */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
              admin.role
            )}`}
          >
            {admin.role}
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
            {admin.isActive ? 'ACTIVE' : 'SUSPENDED'}
          </span>
        </td>

        {/* Last Login */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {admin.lastLogin ? formatDate(admin.lastLogin) : 'Never'}
        </td>

        {/* Created At */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDate(admin.createdAt)}
        </td>

        {/* Actions */}
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center gap-2">
            {/* ✅ CONDITIONAL RENDERING: Change Role button */}
            {canChangeRole && !isSelf && (
              <button
                onClick={() => setShowRoleModal(true)}
                className="text-blue-600 hover:text-blue-900"
                title="Change role"
              >
                Change Role
              </button>
            )}

            {/* ✅ CONDITIONAL RENDERING: Deactivate button */}
            {canDeactivate && !isSelf && (
              <button
                onClick={() => setShowDeactivateDialog(true)}
                className={`${
                  admin.isActive
                    ? 'text-red-600 hover:text-red-900'
                    : 'text-green-600 hover:text-green-900'
                }`}
                title={admin.isActive ? 'Deactivate' : 'Activate'}
              >
                {admin.isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}

            {/* ❌ TIDAK ADA tombol untuk self-edit role atau self-disable */}
          </div>
        </td>
      </tr>

      {/* Change Role Modal */}
      {showRoleModal && (
        <ChangeRoleModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          onSuccess={() => {
            setShowRoleModal(false);
            onUpdate();
          }}
          admin={admin}
          currentUserId={currentUserId}
        />
      )}

      {/* Deactivate Dialog */}
      {showDeactivateDialog && (
        <DeactivateAdminDialog
          isOpen={showDeactivateDialog}
          onClose={() => setShowDeactivateDialog(false)}
          onSuccess={() => {
            setShowDeactivateDialog(false);
            onUpdate();
          }}
          admin={admin}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
