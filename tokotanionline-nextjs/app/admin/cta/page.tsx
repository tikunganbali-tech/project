/**
 * FASE 5 — Admin CTA Management Page
 * 
 * UI for managing CTA configurations.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CTA {
  id: string;
  enabled: boolean;
  type: 'whatsapp' | 'checkout' | 'link';
  label: string;
  targetUrl: string;
  placement: 'inline' | 'sidebar' | 'footer';
  contentType: 'blog' | 'product' | 'any';
  keywordsInclude: string[];
  keywordsExclude: string[];
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CtaManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ctas, setCtas] = useState<CTA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCta, setEditingCta] = useState<CTA | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    enabled: false,
    type: 'whatsapp' as 'whatsapp' | 'checkout' | 'link',
    label: '',
    targetUrl: '',
    placement: 'inline' as 'inline' | 'sidebar' | 'footer',
    contentType: 'any' as 'blog' | 'product' | 'any',
    keywordsInclude: '',
    keywordsExclude: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }
    if (status === 'authenticated') {
      fetchCtas();
    }
  }, [status, router]);

  const fetchCtas = async () => {
    try {
      const response = await fetch('/api/admin/cta');
      if (response.ok) {
        const data = await response.json();
        setCtas(data.ctas);
      }
    } catch (error) {
      console.error('Error fetching CTAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      keywordsInclude: formData.keywordsInclude
        ? formData.keywordsInclude.split(',').map((k) => k.trim()).filter(Boolean)
        : [],
      keywordsExclude: formData.keywordsExclude
        ? formData.keywordsExclude.split(',').map((k) => k.trim()).filter(Boolean)
        : [],
    };

    try {
      const url = editingCta ? `/api/admin/cta/${editingCta.id}` : '/api/admin/cta';
      const method = editingCta ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingCta(null);
        setFormData({
          enabled: false,
          type: 'whatsapp',
          label: '',
          targetUrl: '',
          placement: 'inline',
          contentType: 'any',
          keywordsInclude: '',
          keywordsExclude: '',
        });
        fetchCtas();
      }
    } catch (error) {
      console.error('Error saving CTA:', error);
    }
  };

  const handleEdit = (cta: CTA) => {
    setEditingCta(cta);
    setFormData({
      enabled: cta.enabled,
      type: cta.type,
      label: cta.label,
      targetUrl: cta.targetUrl,
      placement: cta.placement,
      contentType: cta.contentType,
      keywordsInclude: cta.keywordsInclude.join(', '),
      keywordsExclude: cta.keywordsExclude.join(', '),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus CTA ini?')) return;

    try {
      const response = await fetch(`/api/admin/cta/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCtas();
      }
    } catch (error) {
      console.error('Error deleting CTA:', error);
    }
  };

  const handleToggle = async (cta: CTA) => {
    try {
      const response = await fetch(`/api/admin/cta/${cta.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !cta.enabled,
        }),
      });

      if (response.ok) {
        fetchCtas();
      }
    } catch (error) {
      console.error('Error toggling CTA:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CTA Management</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCta(null);
            setFormData({
              enabled: false,
              type: 'whatsapp',
              label: '',
              targetUrl: '',
              placement: 'inline',
              contentType: 'any',
              keywordsInclude: '',
              keywordsExclude: '',
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Tambah CTA
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingCta ? 'Edit CTA' : 'Tambah CTA Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Enabled</label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="mr-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="checkout">Checkout</option>
                <option value="link">Link</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Label (Button Text)</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target URL</label>
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Placement</label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="inline">Inline</option>
                <option value="sidebar">Sidebar</option>
                <option value="footer">Footer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content Type</label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="any">Any</option>
                <option value="blog">Blog</option>
                <option value="product">Product</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Keywords Include (comma-separated)
              </label>
              <input
                type="text"
                value={formData.keywordsInclude}
                onChange={(e) => setFormData({ ...formData, keywordsInclude: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="pupuk, pestisida, benih"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Keywords Exclude (comma-separated)
              </label>
              <input
                type="text"
                value={formData.keywordsExclude}
                onChange={(e) => setFormData({ ...formData, keywordsExclude: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="contoh, demo"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                {editingCta ? 'Update' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCta(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Placement</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Content Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Clicks</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ctas.map((cta) => (
              <tr key={cta.id}>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(cta)}
                    className={`px-2 py-1 rounded text-xs ${
                      cta.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cta.enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm">{cta.label}</td>
                <td className="px-4 py-3 text-sm">{cta.type}</td>
                <td className="px-4 py-3 text-sm">{cta.placement}</td>
                <td className="px-4 py-3 text-sm">{cta.contentType}</td>
                <td className="px-4 py-3 text-sm">{cta.clickCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(cta)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cta.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ctas.length === 0 && (
          <div className="p-8 text-center text-gray-500">Belum ada CTA</div>
        )}
      </div>
    </div>
  );
}
