/**
 * CategoryGrid - Pure presentational component
 * 
 * Displays grid of product categories
 * Server component only - no client logic
 */

import Link from 'next/link';
import Image from 'next/image';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface CategoryGridProps {
  items: Category[];
}

export default function CategoryGrid({ items }: CategoryGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
      {items.map((category) => (
        <Link
          key={category.id}
          href={`/produk?kategori=${category.slug}`}
          className="group"
        >
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
            <div className="relative h-32 sm:h-36 md:h-40 bg-gray-100">
              {category.imageUrl ? (
                <Image
                  src={normalizeImageSrc(category.imageUrl)}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                  {category.name}
                </div>
              )}
            </div>
            <div className="p-2 sm:p-3 text-center">
              <h3 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 group-hover:text-green-700 transition">
                {category.name}
              </h3>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
