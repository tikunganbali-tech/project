/**
 * PHASE 3.3.1 — GLOBAL WEBSITE SETTINGS (ADMIN CLIENT)
 * 
 * Component: WebsiteSettingsClient
 * 
 * Fungsi: Website Settings Form UI dengan sections
 * 
 * Prinsip:
 * - UI hanya menampilkan berdasarkan permission
 * - Form sections: Identity / Homepage / Pages / Footer
 * - Save → update single row
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import { Save } from 'lucide-react';

interface SiteSettings {
  id?: string;
  siteTitle?: string | null;
  tagline?: string | null;
  logoLight?: string | null;
  logoDark?: string | null;
  favicon?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroCtaText?: string | null;
  showFeaturedProducts?: boolean;
  showLatestPosts?: boolean;
  aboutContent?: string | null;
  contactContent?: string | null;
  footerText?: string | null;
  defaultMetaTitle?: string | null; // PHASE 4.1: SEO Global
  defaultMetaDescription?: string | null; // PHASE 4.1: SEO Global
}

export default function WebsiteSettingsClient() {
  const { data: session, status: sessionStatus } = useSession();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [formData, setFormData] = useState<SiteSettings>({
    siteTitle: '',
    tagline: '',
    logoLight: '',
    logoDark: '',
    favicon: '',
    heroTitle: '',
    heroSubtitle: '',
    heroCtaText: '',
    showFeaturedProducts: true,
    showLatestPosts: true,
    aboutContent: '',
    contactContent: '',
    footerText: '',
    defaultMetaTitle: '',
    defaultMetaDescription: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

  // Defensive: handle session loading state
  const userRole = session?.user ? (session.user as any)?.role : null;
  const canView = userRole ? hasPermission(userRole, 'system.view') : false;
  const canWrite = userRole ? hasPermission(userRole, 'system.manage') : false;

  // 📥 FETCH SETTINGS
  useEffect(() => {
    // Wait for session to be ready
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session) {
      setError('Unauthorized: Please login');
      setLoading(false);
      return;
    }

    if (!canView) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/site-settings');
        
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
        if (data.success) {
          if (data.settings) {
            setSettings(data.settings);
            setFormData({
              siteTitle: data.settings.siteTitle || '',
              tagline: data.settings.tagline || '',
              logoLight: data.settings.logoLight || '',
              logoDark: data.settings.logoDark || '',
              favicon: data.settings.favicon || '',
              heroTitle: data.settings.heroTitle || '',
              heroSubtitle: data.settings.heroSubtitle || '',
              heroCtaText: data.settings.heroCtaText || '',
              showFeaturedProducts: data.settings.showFeaturedProducts ?? true,
              showLatestPosts: data.settings.showLatestPosts ?? true,
              aboutContent: data.settings.aboutContent || '',
              contactContent: data.settings.contactContent || '',
              footerText: data.settings.footerText || '',
              defaultMetaTitle: data.settings.defaultMetaTitle || '',
              defaultMetaDescription: data.settings.defaultMetaDescription || '',
            });
          }
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
  }, [canView, sessionStatus, session]);

  // 📤 UPLOAD SITE ASSET (STEP 4C)
  const handleAssetUpload = async (file: File, assetType: 'logo-light' | 'logo-dark' | 'favicon') => {
    try {
      setUploading({ ...uploading, [assetType]: true });
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetType', assetType);

      const response = await fetch('/api/admin/upload/site-asset', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Upload gagal');
      }

      // Update form data dengan URL internal
      const fieldName = assetType === 'logo-light' ? 'logoLight' : assetType === 'logo-dark' ? 'logoDark' : 'favicon';
      setFormData((prev) => ({ ...prev, [fieldName]: data.url }));

      setSuccess(`${assetType === 'logo-light' ? 'Logo Light' : assetType === 'logo-dark' ? 'Logo Dark' : 'Favicon'} berhasil diupload!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload gagal');
    } finally {
      setUploading({ ...uploading, [assetType]: false });
    }
  };

  // 📝 SAVE SETTINGS
  const handleSave = async () => {
    if (!canWrite) {
      setError('You do not have permission to modify settings');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(data.message || 'Settings saved successfully');
      if (data.settings) {
        setSettings(data.settings);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while session is being checked
  if (sessionStatus === 'loading') {
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

  if (!session) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Unauthorized: Please login to continue.</p>
      </div>
    );
  }

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

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Section 1: Website Identity */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Website Identity</h2>
          <p className="text-sm text-gray-600">Identitas website yang digunakan di metadata, navbar, dan SEO</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>E1-B:</strong> Semua field di bawah ini langsung memengaruhi tampilan frontend. Jika kosong, frontend akan menggunakan fallback default.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Title
              </label>
              <input
                type="text"
                value={formData.siteTitle || ''}
                onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="TOKO TANI ONLINE"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Solusi Pertanian Terpercaya"
              />
            </div>

            {/* STEP 4C: File Upload untuk Logo Light */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo Light
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAssetUpload(file, 'logo-light');
                  }}
                  disabled={uploading['logo-light']}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                />
                {formData.logoLight && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">Current: {formData.logoLight}</span>
                    {formData.logoLight.startsWith('/uploads/site/') && (
                      <img src={formData.logoLight} alt="Logo Light" className="h-8 w-auto" />
                    )}
                  </div>
                )}
                {uploading['logo-light'] && (
                  <p className="text-xs text-gray-500">Uploading...</p>
                )}
              </div>
            </div>

            {/* STEP 4C: File Upload untuk Logo Dark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo Dark
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAssetUpload(file, 'logo-dark');
                  }}
                  disabled={uploading['logo-dark']}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                />
                {formData.logoDark && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">Current: {formData.logoDark}</span>
                    {formData.logoDark.startsWith('/uploads/site/') && (
                      <img src={formData.logoDark} alt="Logo Dark" className="h-8 w-auto" />
                    )}
                  </div>
                )}
                {uploading['logo-dark'] && (
                  <p className="text-xs text-gray-500">Uploading...</p>
                )}
              </div>
            </div>

            {/* STEP 4C: File Upload untuk Favicon */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Favicon
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/x-icon,image/vnd.microsoft.icon,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAssetUpload(file, 'favicon');
                  }}
                  disabled={uploading['favicon']}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                />
                {formData.favicon && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">Current: {formData.favicon}</span>
                    {formData.favicon.startsWith('/uploads/site/') && (
                      <img src={formData.favicon} alt="Favicon" className="h-8 w-8" />
                    )}
                  </div>
                )}
                {uploading['favicon'] && (
                  <p className="text-xs text-gray-500">Uploading...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Homepage Control */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Homepage Control</h2>
          <p className="text-sm text-gray-600">Kontrol konten dan section di homepage</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>E1-B:</strong> Field di bawah ini langsung memengaruhi homepage. Jika kosong, homepage akan menampilkan fallback default.
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hero Title <span className="text-red-500">*</span>
                {!formData.heroTitle && (
                  <span className="ml-2 text-xs text-amber-600">(Kosong: akan menggunakan fallback)</span>
                )}
              </label>
              <input
                type="text"
                value={formData.heroTitle || ''}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Selamat Datang di TOKO TANI ONLINE"
              />
              <p className="mt-1 text-xs text-gray-500">Digunakan di: Homepage Hero Section (H1 utama)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hero Subtitle <span className="text-red-500">*</span>
                {!formData.heroSubtitle && (
                  <span className="ml-2 text-xs text-amber-600">(Kosong: akan menggunakan fallback)</span>
                )}
              </label>
              <input
                type="text"
                value={formData.heroSubtitle || ''}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Solusi pertanian terpercaya untuk kebutuhan Anda"
              />
              <p className="mt-1 text-xs text-gray-500">Digunakan di: Homepage Hero Section (subtitle)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hero CTA Text
                {!formData.heroCtaText && (
                  <span className="ml-2 text-xs text-amber-600">(Kosong: akan menggunakan fallback)</span>
                )}
              </label>
              <input
                type="text"
                value={formData.heroCtaText || ''}
                onChange={(e) => setFormData({ ...formData, heroCtaText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Lihat Produk"
              />
              <p className="mt-1 text-xs text-gray-500">Digunakan di: Homepage Hero Section (tombol CTA)</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tampilkan Produk Unggulan
                </label>
                <p className="text-xs text-gray-600">Toggle untuk menampilkan/menyembunyikan section Produk Unggulan</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, showFeaturedProducts: !formData.showFeaturedProducts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.showFeaturedProducts ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.showFeaturedProducts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tampilkan Konten & Insight
                </label>
                <p className="text-xs text-gray-600">Toggle untuk menampilkan/menyembunyikan section Konten & Insight</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, showLatestPosts: !formData.showLatestPosts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.showLatestPosts ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.showLatestPosts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Static Pages */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Static Pages</h2>
          <p className="text-sm text-gray-600">Konten untuk halaman statis yang bisa diedit dari admin</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>E1-B:</strong> Konten di bawah ini langsung memengaruhi halaman statis frontend (/tentang-kami, /kontak). Jika kosong, halaman akan menampilkan fallback default.
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tentang Kami (HTML)
                {!formData.aboutContent && (
                  <span className="ml-2 text-xs text-amber-600">(Kosong: akan menggunakan fallback)</span>
                )}
              </label>
              <textarea
                value={formData.aboutContent || ''}
                onChange={(e) => setFormData({ ...formData, aboutContent: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Konten untuk halaman /tentang-kami"
              />
              <p className="mt-1 text-xs text-gray-500">Digunakan di: Halaman /tentang-kami (konten utama)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kontak (HTML)
                {!formData.contactContent && (
                  <span className="ml-2 text-xs text-amber-600">(Kosong: akan menggunakan fallback)</span>
                )}
              </label>
              <textarea
                value={formData.contactContent || ''}
                onChange={(e) => setFormData({ ...formData, contactContent: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Konten untuk halaman /kontak"
              />
              <p className="mt-1 text-xs text-gray-500">Digunakan di: Halaman /kontak (konten utama)</p>
            </div>
          </div>
        </div>

        {/* Section 4: Footer */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Footer</h2>
          <p className="text-sm text-gray-600">Deskripsi footer yang ditampilkan di public</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer Description
            </label>
            <textarea
              value={formData.footerText || ''}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Deskripsi footer untuk website"
            />
          </div>
        </div>

        {/* Section 5: SEO Global (PHASE 4.1) */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">SEO Global Settings</h2>
          <p className="text-sm text-gray-600">Default meta tags yang digunakan untuk halaman tanpa SEO spesifik</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Meta Title
              </label>
              <input
                type="text"
                value={formData.defaultMetaTitle || ''}
                onChange={(e) => setFormData({ ...formData, defaultMetaTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="TOKO TANI ONLINE - Solusi Pertanian Terpercaya"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">Rekomendasi: 50-60 karakter</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Meta Description
              </label>
              <textarea
                value={formData.defaultMetaDescription || ''}
                onChange={(e) => setFormData({ ...formData, defaultMetaDescription: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Solusi lengkap kebutuhan pertanian Anda. Benih berkualitas, pupuk, dan alat pertanian terpercaya."
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">Rekomendasi: 150-160 karakter</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {canWrite && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
