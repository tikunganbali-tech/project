/**
 * Product Categories Section
 * 
 * Quick Explore - Marketplace feel
 * Grid icon + text, ringkas, klik langsung ke listing
 */

import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface ProductCategoriesProps {
  categories: Category[];
}

export default function ProductCategories({ categories }: ProductCategoriesProps) {
  // Density tinggi: 6-8 kategori desktop
  const displayCategories = categories.slice(0, 8);

  if (displayCategories.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-10 sm:py-12 md:py-14 border-y border-gray-200">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Section Header - Visual Rhythm */}
        <div className="mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            Kategori Produk
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Eksplor produk berdasarkan kategori
          </p>
        </div>

        {/* Grid - Consistent layout, responsive columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-5 md:gap-6">
          {displayCategories.map((category) => (
            <Link
              key={category.id}
              href={`/produk?category=${category.slug}`}
              className="group p-4 sm:p-5 bg-white border border-gray-200 rounded-lg hover:border-green-500/50 hover:shadow-md transition-all duration-200"
            >
              {/* Category Name - Bold */}
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors line-clamp-2">
                {category.name}
              </h3>

              {/* Info Mikro - Subtext */}
              <p className="text-xs sm:text-sm text-gray-500">
                Eksplor produk
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
