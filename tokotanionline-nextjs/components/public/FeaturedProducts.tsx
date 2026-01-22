/**
 * FeaturedProducts - Pure presentational component
 * 
 * Displays grid of featured products
 * Server component only - no client logic
 */

import Link from 'next/link';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
}

interface FeaturedProductsProps {
  items: FeaturedProduct[];
}

export default function FeaturedProducts({ items }: FeaturedProductsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {items.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 h-full flex flex-col"
          >
            <Link href={`/produk/${product.slug}`} className="block">
              <div className="relative overflow-hidden">
                {product.imageUrl ? (
                  <div className="relative h-40 sm:h-44 md:h-48 lg:h-64 bg-gray-100">
                    <Image
                      src={normalizeImageSrc(product.imageUrl)}
                      alt={product.name}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="h-40 sm:h-44 md:h-48 lg:h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                    Gambar Tidak Tersedia
                  </div>
                )}
              </div>
            </Link>

            <div className="p-2.5 sm:p-3 md:p-4 flex-1 flex flex-col">
              <Link href={`/produk/${product.slug}`} className="group">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-green-700 transition">
                  {product.name}
                </h3>
              </Link>

              <div className="flex items-baseline space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2 flex-wrap">
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                  Rp {product.priceResolved.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="mt-auto pt-2 sm:pt-3 md:pt-4">
                <Link href={`/produk/${product.slug}`} className="block">
                  <button className="w-full bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-lg text-center py-1.5 sm:py-2 md:py-2.5 hover:bg-gray-200 flex items-center justify-center gap-1 transition-colors">
                    <Eye className="h-3 w-3 sm:h-3.5 md:h-4 sm:w-3 md:w-4 flex-shrink-0" />
                    <span>Lihat Detail</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-6 sm:mt-7 md:mt-8">
        <Link href="/produk">
          <button className="border-green-700 text-green-700 hover:bg-green-50 font-semibold px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg border-2 flex items-center gap-2 mx-auto text-xs sm:text-sm md:text-base transition-colors">
            Lihat Semua Produk
          </button>
        </Link>
      </div>
    </>
  );
}
