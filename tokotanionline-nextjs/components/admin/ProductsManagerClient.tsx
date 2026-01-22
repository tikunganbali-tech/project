/**
 * STEP 3.1.1: Admin Product Listing Component
 * 
 * Features:
 * - Filters: Category (parent + sub), Status (DRAFT/PUBLISHED/ARCHIVED), Featured
 * - Sorting: Terbaru, Terlaris
 * - Bulk actions: Publish, Unpublish
 * - Clear status badges (text, not icons)
 * - Production-grade UX (fast, dense, no fancy animations)
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import { hasPermission } from '@/lib/permissions';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';
import FeatureAccessBadge from '@/components/admin/FeatureAccessBadge';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  unit: string;
  imageUrl?: string | null;
  status?: string | null;
  isFeatured: boolean;
  salesWeight: number;
  createdAt: string;
  categoryId: string;
  subCategoryId?: string | null;
  category: Category;
  subCategory?: Category | null;
}

interface ProductsManagerClientProps {
  products: Product[];
  categories: Category[];
  userRole?: string;
}

type SortOption = 'terbaru' | 'terlaris';
type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type FeaturedFilter = 'all' | 'featured' | 'not-featured';

export default function ProductsManagerClient({
  products,
  categories,
  userRole,
}: ProductsManagerClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedFeatured, setSelectedFeatured] = useState<FeaturedFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('terbaru');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Flatten categories for dropdown (parent > child format)
  const flattenedCategories = useMemo(() => {
    const flat: Array<{ id: string; name: string; level: number }> = [];
    
    categories.forEach((cat) => {
      // Add parent categories
      if (!cat.parentId) {
        flat.push({ id: cat.id, name: cat.name, level: 0 });
        
        // Add children if exist
        if (cat.children && cat.children.length > 0) {
          cat.children.forEach((child) => {
            flat.push({ id: child.id, name: `  └ ${child.name}`, level: 1 });
          });
        }
      }
    });
    
    return flat;
  }, [categories]);

  // Filter & sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.name.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (p) =>
          p.categoryId === selectedCategory ||
          p.subCategoryId === selectedCategory
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => {
        const status = p.status || null;
        if (selectedStatus === 'DRAFT') {
          return status === 'DRAFT' || status === null;
        }
        return status === selectedStatus;
      });
    }

    // Featured filter
    if (selectedFeatured === 'featured') {
      filtered = filtered.filter((p) => p.isFeatured);
    } else if (selectedFeatured === 'not-featured') {
      filtered = filtered.filter((p) => !p.isFeatured);
    }

    // Sorting
    if (sortBy === 'terbaru') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Desc
      });
    } else if (sortBy === 'terlaris') {
      filtered.sort((a, b) => b.salesWeight - a.salesWeight); // Desc
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedStatus, selectedFeatured, sortBy]);

  // Handle checkbox toggle
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredAndSortedProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(
        new Set(filteredAndSortedProducts.map((p) => p.id))
      );
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (nextStatus: 'PUBLISHED' | 'DRAFT') => {
    if (selectedProductIds.size === 0) {
      setError('Pilih produk terlebih dahulu');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (
      !confirm(
        `Yakin ingin mengubah status ${selectedProductIds.size} produk menjadi ${nextStatus}?`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/products/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
          nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengupdate status produk');
      }

      // Show results summary
      const { summary } = result;
      if (summary.failed > 0) {
        setError(
          `Update selesai: ${summary.success} berhasil, ${summary.failed} gagal. Refresh halaman untuk melihat perubahan.`
        );
        setTimeout(() => setError(null), 7000);
      } else {
        setSuccess(`${summary.success} produk berhasil diupdate. Refresh halaman untuk melihat perubahan.`);
        setTimeout(() => setSuccess(null), 5000);
      }

      // Clear selection and reload
      setSelectedProductIds(new Set());
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setError(`Error: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Yakin ingin menghapus produk "${productName}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Produk berhasil dihapus');
        setTimeout(() => {
          setSuccess(null);
          window.location.reload();
        }, 1500);
      } else {
        const result = await response.json();
        setError(result.error || 'Gagal menghapus produk');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error: any) {
      setError('Terjadi kesalahan saat menghapus produk');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Check if user can publish (super_admin only)
  const canPublish = hasPermission(userRole, 'product.publish');

  return (
    <div className="space-y-6">
      {/* Feature Access Badge */}
      <FeatureAccessBadge feature="ai" />
      
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Produk</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total: {filteredAndSortedProducts.length} produk
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Tambah Produk
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Cari produk atau kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua Kategori</option>
              {flattenedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured
            </label>
            <select
              value={selectedFeatured}
              onChange={(e) =>
                setSelectedFeatured(e.target.value as FeaturedFilter)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua</option>
              <option value="featured">Featured</option>
              <option value="not-featured">Non-Featured</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urutkan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlaris">Terlaris</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProductIds.size > 0 && (
          <div className="flex items-center gap-3 pt-3 border-t">
            <span className="text-sm text-gray-700">
              {selectedProductIds.size} produk dipilih
            </span>
            {canPublish && (
              <>
                <button
                  onClick={() => handleBulkStatusUpdate('PUBLISHED')}
                  disabled={isBulkActionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isBulkActionLoading ? 'Processing...' : 'Publish Selected'}
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('DRAFT')}
                  disabled={isBulkActionLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isBulkActionLoading ? 'Processing...' : 'Unpublish Selected'}
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedProductIds(new Set())}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    filteredAndSortedProducts.length > 0 &&
                    selectedProductIds.size === filteredAndSortedProducts.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Harga
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stok
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => {
                const status = product.status || null;
                const isDraft = status === 'DRAFT' || status === null;
                const isPublished = status === 'PUBLISHED';
                const isArchived = status === 'ARCHIVED';

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <div className="relative w-12 h-12 bg-gray-100 rounded flex-shrink-0">
                            <Image
                              src={normalizeImageSrc(product.imageUrl)}
                              alt={product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </div>
                          {product.isFeatured && (
                            <span className="text-xs text-green-600 font-medium">
                              FEATURED
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{product.category.name}</div>
                        {product.subCategory && (
                          <div className="text-xs text-gray-400">
                            └ {product.subCategory.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.discountPrice ? (
                        <div>
                          <span className="text-green-600 font-semibold">
                            Rp {product.discountPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-gray-400 line-through text-xs ml-2">
                            Rp {product.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <span>Rp {product.price.toLocaleString('id-ID')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.stock} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          isPublished
                            ? 'bg-green-100 text-green-800'
                            : isDraft
                              ? 'bg-gray-100 text-gray-800'
                              : isArchived
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {isPublished
                          ? 'PUBLISHED'
                          : isDraft
                            ? 'DRAFT'
                            : isArchived
                              ? 'ARCHIVED'
                              : 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/produk/${product.slug}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-900"
                          title="Lihat"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-900"
                          title="Hapus"
                          onClick={() => handleDelete(product.id, product.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-gray-600 font-medium">
                      {products.length === 0
                        ? 'Belum ada produk'
                        : 'Tidak ada produk yang sesuai dengan filter'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {products.length === 0
                        ? 'Klik "Tambah Produk" untuk membuat produk pertama.'
                        : 'Coba ubah filter atau hapus pencarian untuk melihat semua produk.'}
                    </p>
                    {products.length === 0 ? (
                      <Link
                        href="/admin/products/new"
                        className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
                      >
                        Tambah Produk
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                          setSelectedStatus('all');
                          setSelectedFeatured('all');
                        }}
                        className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
