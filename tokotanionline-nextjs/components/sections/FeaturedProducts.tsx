/**
 * Featured Products Section
 * 
 * Menampilkan 6 produk nyata dari Public API
 * - Data READ-ONLY
 * - Tidak ada dummy/hardcode
 * - Grid clean, card sederhana
 * - Fokus ke produk, bukan dekorasi
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
  category?: {
    name: string;
    slug: string;
  } | null;
}

interface FeaturedProductsProps {
  products: Product[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  // Display 6 products like reference design
  const displayProducts = products.slice(0, 6);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl lg:text-3.5xl font-bold mb-2 sm:mb-3 text-gray-900">Produk Unggulan</h2>
          <p className="text-sm sm:text-base text-gray-600">Produk pilihan terbaik untuk pertanian Anda</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
          {displayProducts.map((product) => (
            <Link
              key={product.id}
              href={`/produk/${product.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
            >
              <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                {product.imageUrl ? (
                  <Image
                    src={normalizeImageSrc(product.imageUrl)}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    Image: {product.name}
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 md:p-6">
                {product.category && (
                  <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded mb-2">
                    {product.category.name}
                  </span>
                )}
                <h3 className="font-semibold text-base sm:text-lg md:text-xl mt-2 mb-2 group-hover:text-green-700 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                    {formatPrice(product.priceResolved)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-12 md:mt-14">
          <Link
            href="/produk"
            className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 sm:px-7 sm:py-3.5 md:px-8 md:py-4 rounded-lg font-semibold hover:bg-green-800 transition-colors text-sm sm:text-base"
          >
            Lihat Semua Produk
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
