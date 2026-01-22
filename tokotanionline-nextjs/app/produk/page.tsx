/**
 * STEP P2A-3: Public Product List (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/products
 * - ISR revalidate: 300 seconds (5 minutes)
 * - URL-driven (category filter & pagination)
 */

import { getPublicProducts, getPublicHome } from '@/lib/public-api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductGrid from '@/components/public/ProductGrid';
import ProductPagination from '@/components/public/ProductPagination';
import FilterSidebar from '@/components/public/FilterSidebar';
import SortDropdown from '@/components/public/SortDropdown';
import Link from 'next/link';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

export const metadata: Metadata = {
  title: 'Produk - TOKO TANI ONLINE',
  description: 'Katalog produk pertanian terlengkap dengan kualitas terbaik untuk kebutuhan pertanian Anda.',
  alternates: {
    canonical: `${baseUrl}/produk`,
  },
};

interface ProductsPageProps {
  searchParams: {
    category?: string;
    page?: string;
    sort?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Parse URL parameters
  const category = searchParams.category;
  const page = parseInt(searchParams.page || '1', 10);
  const sort = searchParams.sort || 'newest'; // newest, price_asc, price_desc
  const limit = 24; // Increased for better density: 4 columns x 3 rows = 12 visible, 6 rows = 24 total

  // H-FIX-1: SAFE_MODE error handling - return empty state instead of 500
  let productsData;
  let categories: Array<{ id: string; name: string; slug: string; imageUrl: string | null }> = [];
  
  try {
    // Fetch products from public API
    productsData = await getPublicProducts({
      category,
      page,
      limit,
      sort,
    });
  } catch (error) {
    // Log error to server log (non-fatal)
    console.error('[H-FIX-1] Error fetching products:', error);
    // Return safe empty state
    productsData = {
      items: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
      },
    };
  }

  try {
    // Fetch categories for filter bar (reuse home API)
    const homeData = await getPublicHome();
    categories = homeData.categories;
  } catch (error) {
    // Log error to server log (non-fatal)
    console.error('[H-FIX-1] Error fetching categories:', error);
    // Continue with empty categories array
  }

  const totalPages = Math.ceil((productsData.pagination.total || 0) / productsData.pagination.limit);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Breadcrumbs */}
          <nav className="mb-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">Beranda</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Produk</span>
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Semua Produk
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Temukan produk pertanian terbaik untuk kebutuhan Anda
            </p>
          </div>

          {/* Main Content - Sidebar + Grid Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar - Filters */}
            <div className="lg:w-64 flex-shrink-0">
              <FilterSidebar 
                categories={categories} 
                activeCategory={category}
              />
            </div>

            {/* Right Content - Products */}
            <div className="flex-1">
              {/* Top Bar - Results & Sort */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <p className="text-sm text-gray-600">
                  Menampilkan {productsData.items.length} produk
                </p>
                <div className="flex items-center gap-2">
                  <SortDropdown currentSort={sort} category={category} />
                </div>
              </div>

              {/* Products Grid */}
              <ProductGrid items={productsData.items} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <ProductPagination
                    currentPage={page}
                    totalPages={totalPages}
                    category={category}
                    sort={sort}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
