/**
 * FASE F5 — F5-A: SALES ADMIN MANAGEMENT (UI)
 * 
 * Component: CreateSalesAdminModal
 * 
 * Fungsi: Modal untuk create sales admin
 */

'use client';

import { useState } from 'react';

interface CreateSalesAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSalesAdminModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSalesAdminModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    shopeeLink: '',
    tokopediaLink: '',
    isActive: true,
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📝 HANDLE SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.whatsapp.trim()) {
      setError('WhatsApp number is required');
      return;
    }

    // Validate WhatsApp format
    const cleanWhatsapp = formData.whatsapp.replace(/[\s\+-]/g, '');
    if (!/^\d+$/.test(cleanWhatsapp)) {
      setError('Invalid WhatsApp number format. Use digits only (e.g., 6281234567890)');
      return;
    }

    // Validate URLs if provided
    if (formData.shopeeLink && !formData.shopeeLink.startsWith('http')) {
      setError('Shopee link must be a valid URL (start with http:// or https://)');
      return;
    }

    if (formData.tokopediaLink && !formData.tokopediaLink.startsWith('http')) {
      setError('Tokopedia link must be a valid URL (start with http:// or https://)');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/sales-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          whatsapp: cleanWhatsapp,
          shopeeLink: formData.shopeeLink.trim() || null,
          tokopediaLink: formData.tokopediaLink.trim() || null,
          isActive: formData.isActive,
          sortOrder: parseInt(String(formData.sortOrder)) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create sales admin');
        return;
      }

      // Success
      setFormData({
        name: '',
        whatsapp: '',
        shopeeLink: '',
        tokopediaLink: '',
        isActive: true,
        sortOrder: 0,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Error creating sales admin:', err);
      setError('Failed to create sales admin');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RESET ON CLOSE
  const handleClose = () => {
    setFormData({
      name: '',
      whatsapp: '',
      shopeeLink: '',
      tokopediaLink: '',
      isActive: true,
      sortOrder: 0,
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Sales Admin</h2>
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
              placeholder="e.g., Admin Sales 1"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number *
            </label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
              placeholder="6281234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: digits only (e.g., 6281234567890)
            </p>
          </div>

          {/* Shopee Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shopee Link (Optional)
            </label>
            <input
              type="url"
              value={formData.shopeeLink}
              onChange={(e) => setFormData({ ...formData, shopeeLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
              placeholder="https://shopee.co.id/..."
            />
          </div>

          {/* Tokopedia Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tokopedia Link (Optional)
            </label>
            <input
              type="url"
              value={formData.tokopediaLink}
              onChange={(e) => setFormData({ ...formData, tokopediaLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
              placeholder="https://www.tokopedia.com/..."
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order (Priority)
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower number = higher priority in rotation
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (will receive leads)
            </label>
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
              {loading ? 'Creating...' : 'Create Sales Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
