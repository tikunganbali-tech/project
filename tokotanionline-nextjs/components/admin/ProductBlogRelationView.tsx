/**
 * EKSEKUSI 1 - PRODUCT-BLOG RELATION VIEW
 * 
 * Menampilkan relasi produk-blog untuk setiap artikel:
 * - Daftar produk terkait
 * - Status relasi (VALID / WARNING)
 * - Warning jika: Produk tersedia tapi artikel tidak punya related product
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ProductRelation {
  id: string;
  name: string;
  slug: string;
  status: 'VALID' | 'WARNING';
  reason?: string;
}

interface BlogRelation {
  id: string;
  title: string;
  slug: string;
  relatedProductIds: string[] | null;
  categoryId: string | null;
  categoryName: string | null;
  availableProductsCount: number;
  relations: ProductRelation[];
  status: 'VALID' | 'WARNING';
  warningReason?: string;
}

interface ProductBlogRelationViewProps {
  blogId?: string; // If provided, show only this blog
  limit?: number; // Limit number of blogs to show
}

export default function ProductBlogRelationView({
  blogId,
  limit = 50,
}: ProductBlogRelationViewProps) {
  const [blogs, setBlogs] = useState<BlogRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelations();
  }, [blogId]);

  const fetchRelations = async () => {
    try {
      setLoading(true);
      const url = blogId
        ? `/api/admin/blog/posts/${blogId}/product-relations`
        : `/api/admin/blog/posts/product-relations?limit=${limit}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch relations');
      }

      const data = await response.json();
      setBlogs(data.blogs || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat relasi produk-blog');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-gray-500">Loading relations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-gray-500">Tidak ada artikel untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Product-Blog Relations</h3>
          <button
            onClick={fetchRelations}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Blog List */}
      <div className="divide-y">
        {blogs.map((blog) => (
          <div key={blog.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{blog.title}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      blog.status === 'VALID'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {blog.status === 'VALID' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        VALID
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        WARNING
                      </span>
                    )}
                  </span>
                </div>
                {blog.categoryName && (
                  <p className="text-sm text-gray-500">Category: {blog.categoryName}</p>
                )}
                {blog.warningReason && (
                  <p className="text-sm text-yellow-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {blog.warningReason}
                  </p>
                )}
              </div>
              <Link
                href={`/admin/blog/posts/${blog.id}/edit`}
                className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
              >
                Edit
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Related Products */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Related Products ({blog.relations.length})
                </span>
                {blog.availableProductsCount > 0 && (
                  <span className="text-xs text-gray-500">
                    ({blog.availableProductsCount} available in category)
                  </span>
                )}
              </div>
              {blog.relations.length > 0 ? (
                <div className="space-y-1">
                  {blog.relations.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            product.status === 'VALID' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        />
                        <span className="text-gray-700">{product.name}</span>
                      </div>
                      {product.status === 'WARNING' && product.reason && (
                        <span className="text-xs text-yellow-700">{product.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {blog.availableProductsCount > 0
                    ? 'Tidak ada produk terkait (WARNING: Produk tersedia di kategori)'
                    : 'Tidak ada produk terkait'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Total: {blogs.length} artikel
          </span>
          <div className="flex items-center gap-4">
            <span className="text-green-700">
              Valid: {blogs.filter((b) => b.status === 'VALID').length}
            </span>
            <span className="text-yellow-700">
              Warning: {blogs.filter((b) => b.status === 'WARNING').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
