/**
 * PHASE C3 — Product Suggestion Component
 * 
 * Displays product suggestions (max 6 products)
 * Server component - fetches from public API
 * Responsive grid layout
 */

import Link from 'next/link';
import Image from 'next/image';
import { getPublicProducts } from '@/lib/public-api';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

type ProductSuggestionItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  priceResolved: number;
  category: {
    name: string;
  };
};

export default async function ProductSuggestion() {
  // Fetch max 6 products from API
  let products: ProductSuggestionItem[] = [];
  try {
    const response = (await getPublicProducts({
      limit: 6,
      sort: 'newest',
    })) as { items?: ProductSuggestionItem[] };
    products = response.items || [];
  } catch (error) {
    // Fail silently - don't show products if API fails
    console.error('[ProductSuggestion] Error fetching products:', error);
  }

  // Don't render if no products
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 sm:mt-12">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
        Produk Rekomendasi
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 text-center">
        Produk-produk terpilih yang mungkin Anda butuhkan
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/produk/${product.slug}`}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="relative overflow-hidden">
              {product.imageUrl ? (
                <div className="relative h-40 sm:h-48 bg-gray-100">
                  <Image
                    src={normalizeImageSrc(product.imageUrl)}
                    alt={product.name}
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-40 sm:h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                  Gambar Tidak Tersedia
                </div>
              )}
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mb-2 inline-block">
                {product.category.name}
              </span>
              <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2 text-gray-900">
                {product.name}
              </h3>
              <p className="text-green-700 font-bold text-base sm:text-lg mb-3 mt-auto">
                Rp {product.priceResolved.toLocaleString('id-ID')}
              </p>
              <button className="w-full bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm rounded-lg text-center py-2 transition-colors font-semibold">
                Lihat Detail
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
