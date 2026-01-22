/**
 * FilterBar - Pure presentational component
 * 
 * URL-based category filter and sorting (no state, no client logic)
 * Server component only
 */

import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface FilterBarProps {
  categories: Category[];
  activeCategory?: string;
  activeSort?: string;
}

export default function FilterBar({ categories, activeCategory, activeSort = 'newest' }: FilterBarProps) {
  // Build URL with filters
  const buildUrl = (category?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (category) {
      params.set('category', category);
    }
    const sortValue = sort || activeSort;
    if (sortValue && sortValue !== 'newest') {
      params.set('sort', sortValue);
    }
    const queryString = params.toString();
    return `/produk${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="mb-6 sm:mb-8 space-y-4">
      {/* Category Filter */}
      {categories.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* All categories button */}
            <Link
              href={buildUrl(undefined, activeSort)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !activeCategory
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Semua Kategori
            </Link>

            {/* Category buttons */}
            {categories.map((category) => {
              const isActive = activeCategory === category.slug;
              return (
                <Link
                  key={category.id}
                  href={buildUrl(category.slug, activeSort)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Sorting */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Urutkan:</span>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl(activeCategory, 'newest')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeSort === 'newest' || !activeSort
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Terbaru
            </Link>
            <Link
              href={buildUrl(activeCategory, 'price_asc')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeSort === 'price_asc'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Harga Termurah
            </Link>
            <Link
              href={buildUrl(activeCategory, 'price_desc')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeSort === 'price_desc'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Harga Termahal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
