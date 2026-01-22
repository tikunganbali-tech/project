/**
 * STEP P2A-5: Public Blog List (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/blog
 * - ISR revalidate: 300 seconds (5 minutes)
 * - URL-based pagination
 */

import { getPublicBlogList } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';
import { getCategoriesByContext } from '@/lib/unified-category-utils';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogList from '@/components/public/BlogList';
import BlogPagination from '@/components/public/BlogPagination';
import FilterSidebar from '@/components/public/FilterSidebar';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  
  return {
    title: truncateTitle('Blog Pertanian - TOKO TANI ONLINE', 60),
    description: truncateMetaDescription(
      'Artikel dan tips pertanian terbaru. Panduan budidaya, pengendalian hama, dan informasi produk pertanian.',
      160
    ) || defaults.description,
    alternates: {
      canonical: `${baseUrl}/blog`,
    },
  };
}

interface BlogPageProps {
  searchParams: {
    page?: string;
    category?: string;
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  // Parse URL parameters
  const category = searchParams.category;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 10;

  // H-FIX-2: SAFE_MODE error handling - return empty state instead of 500
  let blogData;
  let categories: Array<{ id: string; name: string; slug: string; imageUrl: string | null }> = [];
  
  try {
    // Fetch blog posts from public API
    blogData = await getPublicBlogList(page, limit);
  } catch (error) {
    // Log error to server log (non-fatal)
    console.error('[H-FIX-2] Error fetching blog posts:', error);
    // Return safe empty state
    blogData = {
      items: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // STEP 2: Fetch categories with context='blog'
  try {
    const blogCategories = await getCategoriesByContext('blog', {
      isActive: true,
      includeInactive: false,
    });
    categories = blogCategories
      .filter((cat) => !cat.parentId) // Root categories only for sidebar
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: null,
      }));
  } catch (error) {
    console.error('[STEP-2] Error fetching blog categories:', error);
    // Continue with empty categories
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Blog Pertanian
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Artikel dan tips pertanian terbaru untuk membantu kesuksesan pertanian Anda
            </p>
          </div>

          {/* Main Content - Sidebar + List Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar - Filters */}
            {categories.length > 0 && (
              <div className="lg:w-64 flex-shrink-0">
                <FilterSidebar 
                  categories={categories} 
                  activeCategory={category}
                  basePath="/blog"
                  showPriceFilter={false}
                />
              </div>
            )}

            {/* Right Content - Blog List */}
            <div className="flex-1">
              {/* Blog List */}
              <BlogList items={blogData.items} />

              {/* Pagination */}
              {blogData.pagination && (
                <>
                  <div className="mt-8">
                    <BlogPagination
                      currentPage={blogData.pagination.page}
                      totalPages={blogData.pagination.totalPages}
                    />
                  </div>

                  {/* Results info */}
                  {blogData.pagination.total > 0 && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                      Menampilkan {((blogData.pagination.page - 1) * blogData.pagination.limit) + 1} - {Math.min(blogData.pagination.page * blogData.pagination.limit, blogData.pagination.total)} dari {blogData.pagination.total} artikel
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
