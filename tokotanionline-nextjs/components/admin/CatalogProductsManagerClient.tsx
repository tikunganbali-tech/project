'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface CatalogProductsManagerClientProps {
  products: any[];
}

export default function CatalogProductsManagerClient({
  products: initialProducts,
}: CatalogProductsManagerClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/catalog-products/by-id/${id}/publish`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const result = await response.json();
        setProducts(
          products.map((p) => (p.id === id ? result.product : p))
        );
      } else {
        alert('Gagal mengubah status publish');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Produk</h1>
        <Link href="/admin/catalog-products/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Tambah Produk
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nama
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Harga
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tanggal
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    Rp {product.price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTogglePublish(product.id, product.published)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.published
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {product.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(product.createdAt), 'd MMM yyyy', { locale: id })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/catalog-products/${product.id}/edit`}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Tidak ada produk
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

