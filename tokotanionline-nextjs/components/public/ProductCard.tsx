/**
 * F7-B — ProductCard with BUY Flow
 * 
 * Displays a single product card with BUY button
 * Client component with CheckoutModal popup
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import CheckoutModal from '@/components/CheckoutModal';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
  price: number;
  discountPrice: number | null;
  stock: number;
  unit: string;
  shopeeUrl: string | null;
  tokopediaUrl: string | null;
  shortDescription: string | null;
  packagingVariants: string | null;
  category: {
    name: string;
    slug: string;
  };
}

export default function ProductCard({
  id,
  name,
  slug,
  imageUrl,
  priceResolved,
  price,
  discountPrice,
  stock,
  unit,
  shopeeUrl,
  tokopediaUrl,
  shortDescription,
  packagingVariants,
  category,
}: ProductCardProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300 h-full flex flex-col">
        <Link href={`/produk/${slug}`} className="block">
          <div className="relative overflow-hidden bg-white">
            {imageUrl ? (
              <div className="relative h-56 md:h-64 bg-gray-50">
                <Image
                  src={normalizeImageSrc(imageUrl)}
                  alt={name}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="h-56 md:h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                Gambar Tidak Tersedia
              </div>
            )}
            {/* Category Tag - Top Left - Light Blue Pill */}
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                {category.name}
              </span>
            </div>
          </div>
        </Link>

        <div className="p-5 flex-1 flex flex-col">
          <Link href={`/produk/${slug}`} className="group flex-1 flex flex-col mb-3">
            <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition text-gray-900">
              {name}
            </h3>
            {shortDescription && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
                {shortDescription}
              </p>
            )}
          </Link>

          <div className="flex items-baseline mb-4">
            <span className="text-xl font-bold text-blue-600">
              Rp {priceResolved.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="mt-auto">
            {/* F7-B: BUY Button - opens popup with 3 channels */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsCheckoutOpen(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg text-center py-3 flex items-center justify-center gap-2 transition-colors font-semibold"
            >
              <ShoppingBag className="h-4 w-4 flex-shrink-0" />
              <span>BELI</span>
            </button>
          </div>
        </div>
      </div>

      {/* F7-B: CheckoutModal with 3 channels (WA / Shopee / Tokopedia) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        product={{
          id,
          name,
          price,
          discountPrice,
          stock,
          unit,
          shopeeUrl,
          tokopediaUrl,
          shortDescription,
          packagingVariants,
          category,
        }}
      />
    </>
  );
}
