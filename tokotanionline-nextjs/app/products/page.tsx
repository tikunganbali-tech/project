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
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductGrid from '@/components/public/ProductGrid';
import ProductPagination from '@/components/public/ProductPagination';
import FilterBar from '@/components/public/FilterBar';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  
  return {
    title: truncateTitle('Produk - TOKO TANI ONLINE', 60),
    description: truncateMetaDescription(
      'Katalog produk pertanian terlengkap dengan kualitas terbaik untuk kebutuhan pertanian Anda.',
      160
    ) || defaults.description,
    alternates: {
      canonical: `${baseUrl}/produk`,
    },
  };
}

interface ProductsPageProps {
  searchParams: {
    category?: string;
    page?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Parse URL parameters
  const category = searchParams.category;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;

  // Fetch products from public API
  const productsData = await getPublicProducts({
    category,
    page,
    limit,
  });

  // Fetch categories for filter bar (reuse home API)
  const homeData = await getPublicHome();
  const categories = homeData.categories;

  const totalPages = Math.ceil(productsData.pagination.total / productsData.pagination.limit);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Produk
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Katalog produk pertanian terlengkap dengan kualitas terbaik
            </p>
          </div>

          {/* Category Filter */}
          <FilterBar categories={categories} activeCategory={category} />

          {/* Products Grid */}
          <ProductGrid items={productsData.items} />

          {/* Pagination */}
          <ProductPagination
            currentPage={page}
            totalPages={totalPages}
            category={category}
          />

          {/* Results info */}
          {productsData.pagination.total > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, productsData.pagination.total)} dari {productsData.pagination.total} produk
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
