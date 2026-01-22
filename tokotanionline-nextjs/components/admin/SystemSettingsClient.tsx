/**
 * STEP 24C — SYSTEM SETTINGS (GLOBAL CONFIG & SAFETY)
 * 
 * Component: SystemSettingsClient
 * 
 * Fungsi: System Settings UI dengan sections
 * 
 * Prinsip:
 * - UI hanya menampilkan berdasarkan permission
 * - Read-only fields ditandai jelas
 * - Toggle hanya muncul jika permission cocok
 * - Tooltip penjelasan manusiawi
 * - Warning sebelum perubahan
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, isSuperAdmin } from '@/lib/permissions';

interface SystemSettings {
  systemFlags: {
    safeMode: boolean;
    featureFreeze: boolean;
  };
  sales: {
    salesEnabled: boolean;
    phaseFSocialProofEnabled: boolean;
  };
  content: {
    defaultPublishMode: string;
  };
  marketing: {
    eventLoggingEnabled: boolean;
  };
  security: {
    sessionMaxAge: string;
    sessionMaxAgeLong: string;
  };
}

export default function SystemSettingsClient() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showFeatureFreezeWarning, setShowFeatureFreezeWarning] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canView = hasPermission(userRole, 'system.view');
  const canWrite = hasPermission(userRole, 'system.manage');
  const userIsSuperAdmin = isSuperAdmin(userRole);
  const canModify = userIsSuperAdmin && canWrite;

  // 📥 FETCH SETTINGS
  useEffect(() => {
    if (!canView) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/system/settings');
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('Forbidden: Insufficient permissions');
          } else if (response.status === 401) {
            setError('Unauthorized: Please login again');
          } else {
            setError('Failed to load settings');
          }
          return;
        }

        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        } else {
          setError('Invalid response format');
        }
      } catch (err: any) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [canView]);

  // 📝 UPDATE SALES TOGGLE (F5-B)
  const handleSalesToggle = async (toggleName: 'salesEnabled' | 'phaseFSocialProofEnabled', newValue: boolean) => {
    if (!canModify) {
      setError('You do not have permission to modify this setting');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);
      const response = await fetch('/api/admin/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [toggleName]: newValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update setting');
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Success - refresh settings
      const refreshResponse = await fetch('/api/admin/system/settings');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.settings) {
          setSettings(refreshData.settings);
        }
      }

      setSuccess(data.message || 'Setting updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating setting:', err);
      setError('Failed to update setting');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  // 📝 UPDATE FEATURE FREEZE
  const handleFeatureFreezeToggle = async (newValue: boolean) => {
    if (!canModify) {
      setError('You do not have permission to modify this setting');
      setTimeout(() => setError(null), 5000);
      return;
    }

    // ⚠️ WARNING DIALOG
    if (!showFeatureFreezeWarning) {
      setShowFeatureFreezeWarning(true);
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);
      const response = await fetch('/api/admin/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFreeze: newValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update setting');
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Success - refresh settings
      const refreshResponse = await fetch('/api/admin/system/settings');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.settings) {
          setSettings(refreshData.settings);
        }
      }

      setSuccess(data.message || 'Setting updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowFeatureFreezeWarning(false);
    } catch (err: any) {
      console.error('Error updating setting:', err);
      setError('Failed to update setting');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdating(false);
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
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        ))}
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

  if (!settings) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No settings found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Feature Freeze Warning Modal */}
      {showFeatureFreezeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">⚠️ Warning</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                <strong>Feature Freeze</strong> akan mempengaruhi akses semua admin (kecuali super_admin).
                Non-super_admin akan menjadi read-only.
              </p>
              <p className="text-sm text-gray-700">
                Pastikan Anda memahami konsekuensinya sebelum melanjutkan.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowFeatureFreezeWarning(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleFeatureFreezeToggle(!settings.systemFlags.featureFreeze)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Feature Toggles Section (F5-B) */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Feature Toggles</h2>
        <div className="space-y-4">
          {/* salesEnabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Sales Enabled</span>
                {canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-200 text-blue-700 rounded">
                    MODIFIABLE
                  </span>
                )}
                {!canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    READ-ONLY
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Enable/disable sales functionality. When OFF, all BELI buttons are disabled.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canModify ? (
                <button
                  onClick={() => handleSalesToggle('salesEnabled', !settings.sales.salesEnabled)}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.sales.salesEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sales.salesEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    settings.sales.salesEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {settings.sales.salesEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              )}
            </div>
          </div>

          {/* phaseFSocialProofEnabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Phase F Social Proof</span>
                {canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-200 text-blue-700 rounded">
                    MODIFIABLE
                  </span>
                )}
                {!canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    READ-ONLY
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Enable/disable Phase F social proof features. When OFF, social proof processing is skipped (fail-soft).
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canModify ? (
                <button
                  onClick={() => handleSalesToggle('phaseFSocialProofEnabled', !settings.sales.phaseFSocialProofEnabled)}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.sales.phaseFSocialProofEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sales.phaseFSocialProofEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    settings.sales.phaseFSocialProofEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {settings.sales.phaseFSocialProofEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Flags Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Flags</h2>
        <div className="space-y-4">
          {/* SAFE_MODE (Read-only) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">SAFE MODE</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  READ-ONLY
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Mode keamanan sistem. Hanya bisa diubah melalui file konfigurasi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  settings.systemFlags.safeMode
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {settings.systemFlags.safeMode ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          {/* FEATURE_FREEZE (Toggle for super_admin) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">FEATURE FREEZE</span>
                {canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-200 text-blue-700 rounded">
                    MODIFIABLE
                  </span>
                )}
                {!canModify && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    READ-ONLY
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Mode production freeze. Non-super_admin menjadi read-only saat aktif.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canModify ? (
                <button
                  onClick={() => handleFeatureFreezeToggle(!settings.systemFlags.featureFreeze)}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.systemFlags.featureFreeze ? 'bg-yellow-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.systemFlags.featureFreeze ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    settings.systemFlags.featureFreeze
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {settings.systemFlags.featureFreeze ? 'ACTIVE' : 'INACTIVE'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Settings Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Default Publish Mode</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  READ-ONLY
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Semua konten baru dibuat sebagai draft (safety default).
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {settings.content.defaultPublishMode.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Marketing Settings Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Marketing Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Event Logging</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  READ-ONLY
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Event logging selalu aktif untuk audit trail.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {settings.marketing.eventLoggingEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>

      {/* Security Settings Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Session Max Age</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  READ-ONLY
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Durasi maksimal session (default: 8 hours, remember: 30 days).
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {settings.security.sessionMaxAge}
              </div>
              <div className="text-xs text-gray-500">
                (Remember: {settings.security.sessionMaxAgeLong})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Information</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • <strong>SAFE MODE:</strong> Hanya bisa diubah melalui file konfigurasi (
            <code className="bg-blue-100 px-1 rounded">lib/admin-config.ts</code>)
          </li>
          <li>
            • <strong>FEATURE FREEZE:</strong> Hanya super_admin yang bisa mengubah. Perubahan
            memerlukan code deployment.
          </li>
          <li>
            • <strong>Read-only settings:</strong> Ditampilkan untuk informasi, tidak bisa diubah
            via UI.
          </li>
          <li>
            • <strong>Audit Trail:</strong> Semua perubahan settings dicatat di Activity Log.
          </li>
        </ul>
      </div>
    </div>
  );
}
