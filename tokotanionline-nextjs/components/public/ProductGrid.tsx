/**
 * ProductGrid - Pure presentational component
 * 
 * Displays grid of products
 * Server component only - no client logic
 */

import ProductCard from './ProductCard';
import type { PublicProduct } from '@/lib/public-api';

interface ProductGridProps {
  items: PublicProduct[];
}

export default function ProductGrid({ items }: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-gray-700 font-medium text-lg">
            Tidak ada produk yang ditemukan
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Coba ubah filter atau kategori untuk melihat produk lainnya. Jika Anda mencari sesuatu yang spesifik, silakan hubungi kami.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {items.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}
