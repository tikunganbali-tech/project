/**
 * FASE 1.3 — ADMIN CATEGORIES MANAGEMENT
 * 
 * Features:
 * - Tree-table dengan expand/collapse
 * - Filter: Status, Level
 * - Search: Name (case-insensitive)
 * - Kolom: Name, Parent, Level, Status, Digunakan oleh (Produk, Konten), Updated At
 * - Create/Edit dengan guards (circular, max 2 level, duplicate name)
 * - Usage insight (Produk & Konten count + links)
 * - Warning saat INACTIVE/ARCHIVE jika masih digunakan
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, ChevronRight, ChevronDown, Package, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  type?: 'PRODUCT' | 'BLOG'; // FITUR 3: Unified type
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
  productCount?: number;
  blogCount?: number; // FITUR 3: Blog count
  contentCount?: number;
  seoTitle?: string | null; // FITUR 3: SEO fields
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoryManagerClientProps {
  categories: Category[];
  userRole?: string;
}

export default function CategoryManagerClient({
  categories,
  userRole,
}: CategoryManagerClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'BLOG'>('ALL'); // FITUR 3: Type filter
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ROOT' | 'CHILD'>('ALL');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'PRODUCT' as 'PRODUCT' | 'BLOG', // FITUR 3: Type field
    description: '',
    imageUrl: '',
    parentId: '',
    seoTitle: '', // FITUR 3: SEO fields
    seoDescription: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null); // FITUR 3: Delete state

  // Flatten tree untuk filtering & searching dengan expand/collapse
  const flatCategories = useMemo(() => {
    const flatten = (
      cats: Category[],
      level: number = 0,
      expanded: Set<string>
    ): Array<Category & { level: number }> => {
      const result: Array<Category & { level: number }> = [];
      // Sort: Parent dulu, lalu alfabet
      const sorted = [...cats].sort((a, b) => {
        // Root categories first
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
      for (const cat of sorted) {
        result.push({ ...cat, level });
        // Only include children if expanded
        if (cat.children && cat.children.length > 0 && expanded.has(cat.id)) {
          result.push(...flatten(cat.children, level + 1, expanded));
        }
      }
      return result;
    };
    return flatten(categories, 0, expandedCategories);
  }, [categories, expandedCategories]);

  // Filter & search
  const filteredCategories = useMemo(() => {
    let filtered = flatCategories;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((cat) => cat.name.toLowerCase().includes(term));
    }

    // FITUR 3: Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((cat) => cat.type === typeFilter);
    }

    // Level filter
    if (levelFilter === 'ROOT') {
      filtered = filtered.filter((cat) => cat.level === 0);
    } else if (levelFilter === 'CHILD') {
      filtered = filtered.filter((cat) => cat.level > 0);
    }

    return filtered;
  }, [flatCategories, searchTerm, typeFilter, levelFilter]);

  // Toggle expand/collapse
  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Flatten categories untuk parent selector (hanya root, same type)
  const availableParents = useMemo(() => {
    return categories.filter((cat) => !cat.parentId && cat.type === formData.type);
  }, [categories, formData.type]);

  // Auto-generate slug from name (FITUR 3: Slug akan di-generate di backend dengan auto-increment)
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Handle form input
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !editingCategory) {
        // Auto-generate slug preview (final slug akan di-generate di backend)
        updated.slug = generateSlug(value);
      }
      // FITUR 3: Reset parentId jika type berubah
      if (field === 'type' && value !== prev.type) {
        updated.parentId = '';
      }
      return updated;
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      type: 'PRODUCT',
      description: '',
      imageUrl: '',
      parentId: '',
      seoTitle: '',
      seoDescription: '',
    });
    setEditingCategory(null);
    setShowForm(false);
    setError('');
  };

  // Start editing
  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      type: category.type || 'PRODUCT',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      parentId: category.parentId || '',
      seoTitle: category.seoTitle || '',
      seoDescription: category.seoDescription || '',
    });
    setShowForm(true);
  };

  // Handle save (create or update)
  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Nama kategori diperlukan');
      }
      if (!formData.slug.trim()) {
        throw new Error('Slug diperlukan');
      }

      // Check duplicate name pada parent yang sama
      if (editingCategory) {
        const existing = await fetch(`/api/admin/categories`).then((r) => r.json());
        const flat = existing.flat || [];
        const duplicate = flat.find(
          (cat: Category) =>
            cat.name.toLowerCase() === formData.name.toLowerCase() &&
            cat.parentId === formData.parentId &&
            cat.id !== editingCategory.id
        );
        if (duplicate) {
          throw new Error('Nama kategori sudah digunakan pada parent yang sama');
        }
      } else {
        const existing = await fetch(`/api/admin/categories`).then((r) => r.json());
        const flat = existing.flat || [];
        const duplicate = flat.find(
          (cat: Category) =>
            cat.name.toLowerCase() === formData.name.toLowerCase() &&
            cat.parentId === formData.parentId
        );
        if (duplicate) {
          throw new Error('Nama kategori sudah digunakan pada parent yang sama');
        }
      }

      const payload: any = {
        name: formData.name,
        slug: formData.slug || undefined, // Optional: auto-generate jika kosong
        type: formData.type, // FITUR 3: Type wajib
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        seoTitle: formData.seoTitle || undefined, // FITUR 3: SEO fields
        seoDescription: formData.seoDescription || undefined,
      };

      if (editingCategory) {
        // Update existing category
        if (formData.parentId !== editingCategory.parentId) {
          // Parent changed, use PATCH to move
          if (formData.parentId) {
            const moveResponse = await fetch(`/api/admin/categories/${editingCategory.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parentId: formData.parentId }),
            });

            if (!moveResponse.ok) {
              const moveResult = await moveResponse.json();
              throw new Error(moveResult.error || 'Gagal memindahkan kategori');
            }
          } else {
            // Move to root
            const moveResponse = await fetch(`/api/admin/categories/${editingCategory.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parentId: null }),
            });

            if (!moveResponse.ok) {
              const moveResult = await moveResponse.json();
              throw new Error(moveResult.error || 'Gagal memindahkan kategori');
            }
          }
        }

        // Update other fields
        const updateResponse = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!updateResponse.ok) {
          const result = await updateResponse.json();
          throw new Error(result.error || 'Gagal mengupdate kategori');
        }
      } else {
        // Create new category
        if (formData.parentId) {
          payload.parentId = formData.parentId;
        } else {
          payload.parentId = null;
        }

        const createResponse = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!createResponse.ok) {
          const result = await createResponse.json();
          throw new Error(result.error || result.message || 'Gagal membuat kategori');
        }
      }

      router.refresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // FITUR 3: Handle delete dengan proteksi
  const handleDelete = async (category: Category) => {
    if (!confirm(`Hapus kategori "${category.name}"?`)) {
      return;
    }

    setDeletingId(category.id);
    setError('');

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        // FITUR 3: Error message jelas & manusiawi
        throw new Error(result.message || result.error || 'Gagal menghapus kategori');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menghapus kategori');
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  // Render tree row
  const renderCategoryRow = (category: Category & { level: number }, index: number) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const level = category.level;
    const isRoot = level === 0;
    const productCount = category.productCount || 0;
    const blogCount = category.blogCount || 0; // FITUR 3: Blog count
    const contentCount = category.contentCount || 0;
    const isUsed = productCount > 0 || blogCount > 0 || contentCount > 0;
    const categoryType = category.type || 'PRODUCT'; // FITUR 3: Type display

    return (
      <tr key={category.id} className="border-b hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium text-gray-900">{category.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {category.parent ? category.parent.name : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            categoryType === 'PRODUCT' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {categoryType}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {isRoot ? 'Root' : 'Child'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <div className="flex items-center gap-3 flex-wrap">
            {categoryType === 'PRODUCT' && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <strong>{productCount}</strong>
              </span>
            )}
            {categoryType === 'BLOG' && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <strong>{blogCount}</strong>
              </span>
            )}
            {contentCount > 0 && (
              <span>
                Konten: <strong>{contentCount}</strong>
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {new Date(category.updatedAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => startEdit(category)}
              className="text-blue-600 hover:text-blue-900"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            {/* FITUR 3: Delete button dengan proteksi */}
            <button
              onClick={() => handleDelete(category)}
              disabled={deletingId === category.id}
              className="text-red-600 hover:text-red-900 disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Kategori</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tree-view dengan hierarki Parent → Child (Max 2 levels)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Tambah Kategori
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Nama</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Cari kategori..."
            />
          </div>

          {/* FITUR 3: Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="ALL">Semua</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="BLOG">BLOG</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="ALL">Semua</option>
              <option value="ROOT">Root</option>
              <option value="CHILD">Child</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form (Create/Edit) */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4 border-2 border-green-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h2>

          {/* Usage Warning untuk Edit */}
          {editingCategory && (editingCategory.productCount || 0) + (editingCategory.contentCount || 0) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Kategori ini masih digunakan:
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                    {editingCategory.productCount && editingCategory.productCount > 0 && (
                      <li>
                        <Link
                          href={`/admin/products?category=${editingCategory.id}`}
                          className="underline hover:text-yellow-900"
                        >
                          {editingCategory.productCount} produk
                        </Link>
                      </li>
                    )}
                    {editingCategory.contentCount && editingCategory.contentCount > 0 && (
                      <li>
                        <Link
                          href={`/admin/blog/posts?category=${editingCategory.id}`}
                          className="underline hover:text-yellow-900"
                        >
                          {editingCategory.contentCount} konten
                        </Link>
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-yellow-600">
                    Mengubah nama atau slug tidak akan memutus relasi dengan produk/konten.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kategori *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Nama kategori"
              />
            </div>

            {/* FITUR 3: Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type * (PRODUCT atau BLOG)
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                disabled={!!editingCategory} // Type tidak bisa diubah setelah dibuat
              >
                <option value="PRODUCT">PRODUCT</option>
                <option value="BLOG">BLOG</option>
              </select>
              {editingCategory && (
                <p className="text-xs text-gray-500 mt-1">
                  Type tidak bisa diubah setelah kategori dibuat.
                </p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug * (Auto-generate, bisa diubah manual)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="slug-kategori"
              />
              <p className="text-xs text-gray-500 mt-1">
                Jika kosong, slug akan di-generate otomatis dengan auto-increment untuk menghindari duplikat.
              </p>
            </div>

            {/* Parent Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Kategori (Opsional - kosongkan untuk root category)
              </label>
              <select
                value={formData.parentId}
                onChange={(e) => handleInputChange('parentId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Root Category (Tidak ada parent) --</option>
                {availableParents
                  .filter((p) => !editingCategory || p.id !== editingCategory.id) // Exclude self
                  .map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pilih parent untuk membuat subcategory. Max depth: 2 levels.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi (Opsional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Deskripsi kategori..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL (Opsional)
              </label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* FITUR 3: SEO Fields */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">SEO Metadata</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Title (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Meta title untuk halaman kategori"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digunakan sebagai meta title di halaman kategori. Jika kosong, akan menggunakan nama kategori.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Description (Opsional)
                  </label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Meta description untuk halaman kategori"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digunakan sebagai meta description di halaman kategori. Ideal 150-160 karakter.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.name || !formData.slug}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : editingCategory ? 'Update' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* Category Tree Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Kategori</h2>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-gray-600 font-medium">
                {searchTerm || typeFilter !== 'ALL' || levelFilter !== 'ALL'
                  ? 'Tidak ada kategori yang sesuai dengan filter'
                  : 'Belum ada kategori'}
              </p>
              <p className="text-sm text-gray-500">
                {searchTerm || typeFilter !== 'ALL' || levelFilter !== 'ALL'
                  ? 'Coba ubah filter atau hapus pencarian untuk melihat semua kategori.'
                  : 'Klik "Tambah Kategori" untuk membuat kategori pertama.'}
              </p>
              {searchTerm || typeFilter !== 'ALL' || levelFilter !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('ALL');
                    setLevelFilter('ALL');
                  }}
                  className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Reset Filter
                </button>
              ) : (
                <Link
                  href="/admin/categories/new"
                  className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
                >
                  Tambah Kategori
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Digunakan oleh
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category, index) => renderCategoryRow(category, index))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
