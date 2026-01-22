/**
 * FilterSidebar - HealthStore Style
 * 
 * Left sidebar with category and price filters
 * URL-based filtering (server component)
 */

import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface FilterSidebarProps {
  categories: Category[];
  activeCategory?: string;
  basePath?: string; // Default: '/produk'
  showPriceFilter?: boolean; // Default: true
}

export default function FilterSidebar({ 
  categories, 
  activeCategory,
  basePath = '/produk',
  showPriceFilter = true,
}: FilterSidebarProps) {
  const buildUrl = (category?: string) => {
    const params = new URLSearchParams();
    if (category) {
      params.set('category', category);
    }
    return `${basePath}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <aside className="bg-gray-800 text-white rounded-lg p-6 h-fit sticky top-20">
      <h2 className="text-lg font-bold mb-6">Filter</h2>
      
      {/* Category Filter */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide">Kategori</h3>
        <div className="space-y-2">
          {categories.map((category) => {
            const isActive = activeCategory === category.slug;
            return (
              <Link
                key={category.id}
                href={buildUrl(isActive ? undefined : category.slug)}
                className="flex items-center gap-2 cursor-pointer hover:text-gray-200 transition p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  readOnly
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                />
                <span className="text-sm">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Price Filter - Only for products */}
      {showPriceFilter && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide">Harga</h3>
          <div className="space-y-2">
            {[
              { label: 'Di bawah Rp 100.000', value: 'under-100k' },
              { label: 'Rp 100.000 - Rp 200.000', value: '100k-200k' },
              { label: 'Rp 200.000 - Rp 500.000', value: '200k-500k' },
              { label: 'Di atas Rp 500.000', value: 'over-500k' },
            ].map((price) => (
              <label key={price.value} className="flex items-center gap-2 cursor-pointer hover:text-gray-200 transition p-2 rounded">
                <input
                  type="checkbox"
                  disabled
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 opacity-50"
                />
                <span className="text-sm text-gray-400">{price.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <Link
        href={basePath}
        className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm text-center"
      >
        Reset Filter
      </Link>
    </aside>
  );
}
