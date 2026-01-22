/**
 * FASE 5.1 — STEP 3: PRODUCT / CONTENT HIGHLIGHT (AUTHORITY)
 * 
 * Prinsip:
 * - Grid terkurasi (maks 6 item)
 * - Menampilkan isi nyata (produk/konten), bukan janji
 * - Setiap item: judul, excerpt/short desc, link ke detail
 * - Tanpa slider/carousel, tanpa badge marketing
 * - Whitespace lega, alignment rapi
 * - H2 jelas untuk judul section
 * - Hanya PUBLISHED items (sudah di-filter di API)
 * - Empty state tenang jika tidak ada data
 */

import Link from 'next/link';

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

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | string;
}

interface HighlightsProps {
  products?: Product[];
  posts?: Post[];
  title?: string | null;
}

export default function Highlights({ 
  products = [],
  posts = [],
  title 
}: HighlightsProps) {
  // Gabungkan produk dan konten, limit maksimal 6 item
  const items: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    link: string;
    type: 'product' | 'post';
  }> = [];

  // Tambahkan produk (prioritas)
  if (products && products.length > 0) {
    products.slice(0, 4).forEach((product) => {
      items.push({
        id: product.id,
        title: product.name,
        excerpt: product.category?.name || null,
        link: `/produk/${product.slug}`,
        type: 'product',
      });
    });
  }

  // Tambahkan konten jika masih ada slot (maks 6 total)
  if (posts && posts.length > 0 && items.length < 6) {
    const remainingSlots = 6 - items.length;
    posts.slice(0, remainingSlots).forEach((post) => {
      items.push({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        link: `/blog/${post.slug}`,
        type: 'post',
      });
    });
  }

  // Empty state tenang - tidak render jika tidak ada data
  if (items.length === 0) {
    return null;
  }

  const sectionTitle = title || 'Produk & Konten Terpilih';

  return (
    <section className="bg-gray-50 py-10 sm:py-12 md:py-14 lg:py-16">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl lg:text-3.5xl font-bold text-gray-900 mb-3 tracking-tight">
            {sectionTitle}
          </h2>
        </div>

        {/* Grid terkurasi - maks 6 item */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                className="group bg-white border border-gray-200 rounded-lg p-5 sm:p-6 md:p-7 lg:p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                {/* Judul */}
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 group-hover:text-gray-700 transition-colors leading-tight">
                  {item.title}
                </h3>

                {/* Excerpt / Short Description */}
                {item.excerpt && (
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed line-clamp-3 mb-4">
                    {item.excerpt}
                  </p>
                )}

                {/* Link indicator - subtle */}
                <div className="mt-4 sm:mt-5 flex items-center text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  <span>Lihat detail</span>
                  <svg 
                    className="ml-2 w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
