/**
 * Public Search Page (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/search
 * - ISR revalidate: 300 seconds (5 minutes)
 * - URL-based search query
 */

import { searchPublic } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductGrid from '@/components/public/ProductGrid';
import BlogList from '@/components/public/BlogList';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

interface SearchPageProps {
  searchParams: {
    q?: string;
    type?: string;
    page?: string;
  };
}

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q || '';
  const defaults = await getSeoDefaults();
  
  if (!query) {
    return {
      title: truncateTitle('Cari - TOKO TANI ONLINE', 60),
      description: truncateMetaDescription(
        'Cari produk dan artikel pertanian di Toko Tani Online',
        160
      ) || defaults.description,
      alternates: {
        canonical: `${baseUrl}/search`,
      },
    };
  }

  return {
    title: truncateTitle(`Cari "${query}" - TOKO TANI ONLINE`, 60),
    description: truncateMetaDescription(
      `Hasil pencarian untuk "${query}" di Toko Tani Online`,
      160
    ) || defaults.description,
    alternates: {
      canonical: `${baseUrl}/search?q=${encodeURIComponent(query)}`,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const type = (searchParams.type || 'all') as 'all' | 'products' | 'blog';
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;

  // H-FIX-3: SAFE_MODE error handling - return empty state instead of 500
  let searchData;
  
  if (!query || query.trim().length === 0) {
    searchData = {
      query: '',
      products: [],
      blogPosts: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
        productsTotal: 0,
        blogPostsTotal: 0,
      },
    };
  } else {
    try {
      searchData = await searchPublic({
        q: query,
        type,
        page,
        limit,
      });
    } catch (error) {
      // Log error to server log (non-fatal)
      console.error('[H-FIX-3] Error searching:', error);
      // Return safe empty state
      searchData = {
        query,
        products: [],
        blogPosts: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          productsTotal: 0,
          blogPostsTotal: 0,
        },
      };
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {query ? `Hasil Pencarian: "${query}"` : 'Cari Produk & Artikel'}
            </h1>
            {query && (
              <p className="text-sm sm:text-base text-gray-600">
                Ditemukan {searchData.pagination.total} hasil
              </p>
            )}
          </div>

          {/* Search Form */}
          <div className="mb-6 sm:mb-8">
            <form method="get" action="/search" className="flex gap-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Cari produk atau artikel..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Results */}
          {query && searchData.pagination.total === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Tidak ada hasil untuk &quot;{query}&quot;
              </p>
              <p className="text-sm text-gray-500">
                Coba gunakan kata kunci yang berbeda
              </p>
            </div>
          )}

          {query && searchData.pagination.total > 0 && (
            <>
              {/* Products Section */}
              {searchData.products.length > 0 && (
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Produk ({searchData.pagination.productsTotal})
                  </h2>
                  <ProductGrid items={searchData.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    imageUrl: p.imageUrl,
                    priceResolved: p.discountPrice || p.price,
                    category: p.category,
                  }))} />
                </div>
              )}

              {/* Blog Posts Section */}
              {searchData.blogPosts.length > 0 && (
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Artikel ({searchData.pagination.blogPostsTotal})
                  </h2>
                  <BlogList items={searchData.blogPosts} />
                </div>
              )}

              {/* Pagination Info */}
              {searchData.pagination.totalPages > 1 && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Halaman {searchData.pagination.page} dari {searchData.pagination.totalPages}
                  </p>
                  <div className="flex gap-2 justify-center">
                    {searchData.pagination.page > 1 && (
                      <a
                        href={`/search?q=${encodeURIComponent(query)}&page=${searchData.pagination.page - 1}${type !== 'all' ? `&type=${type}` : ''}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Sebelumnya
                      </a>
                    )}
                    {searchData.pagination.page < searchData.pagination.totalPages && (
                      <a
                        href={`/search?q=${encodeURIComponent(query)}&page=${searchData.pagination.page + 1}${type !== 'all' ? `&type=${type}` : ''}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Selanjutnya
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!query && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Masukkan kata kunci untuk mencari produk atau artikel
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
