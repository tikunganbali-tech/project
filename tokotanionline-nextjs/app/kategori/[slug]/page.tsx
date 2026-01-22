/**
 * FASE 7.2: Category Hub Page (PUBLIC)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/categories/[slug]
 * - ISR revalidate: 300 seconds (5 minutes)
 * - 404 if category not found
 * - Full SEO support (metadata + schema)
 * 
 * Sesuai FASE 7.2.1 - Kategori sebagai HUB:
 * - Ringkasan topik
 * - Link ke cornerstone
 * - Artikel pilihan
 * - Navigasi kontekstual
 */

import { getPublicCategoryHub } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription, generateBreadcrumbSchema } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CategoryHubContent from '@/components/public/CategoryHubContent';
import BlogPagination from '@/components/public/BlogPagination';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

interface CategoryHubPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    page?: string;
  };
}

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata({
  params,
}: CategoryHubPageProps): Promise<Metadata> {
  try {
    const hubData = await getPublicCategoryHub(params.slug, 1, 10);
    const defaults = await getSeoDefaults();

    // Defensive: return safe metadata dengan SEO Global fallback jika category not found
    if (!hubData) {
      return {
        title: truncateTitle(`${params.slug} - TOKO TANI ONLINE`, 60),
        description: truncateMetaDescription(defaults.description, 160),
        alternates: {
          canonical: `${baseUrl}/kategori/${params.slug}`,
        },
      };
    }

    const category = hubData.category;
    const seoTitle = `${category.name} - TOKO TANI ONLINE`;
    const seoDescription = truncateMetaDescription(
      category.summary || category.description || defaults.description,
      160
    );

    return {
      title: truncateTitle(seoTitle, 60),
      description: seoDescription,
      alternates: {
        canonical: `${baseUrl}/kategori/${category.slug}`,
      },
    };
  } catch (error) {
    // Defensive: return safe metadata dengan SEO Global fallback on error
    console.error('Error generating metadata for category hub:', error);
    const defaults = await getSeoDefaults();
    return {
      title: truncateTitle(defaults.title, 60),
      description: truncateMetaDescription(defaults.description, 160),
      alternates: {
        canonical: `${baseUrl}/kategori/${params.slug}`,
      },
    };
  }
}

export default async function CategoryHubPage({
  params,
  searchParams,
}: CategoryHubPageProps) {
  // Parse URL parameters
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 10;

  // Fetch category hub from public API
  const hubData = await getPublicCategoryHub(params.slug, page, limit);

  // 404 if category not found
  if (!hubData) {
    notFound();
  }

  // FASE 6.1: Generate breadcrumb structured data
  const breadcrumbs = [
    { name: 'Beranda', url: '/' },
    { name: 'Kategori', url: '/kategori' },
    { name: hubData.category.name, url: `/kategori/${hubData.category.slug}` },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* FASE 6.1: Structured Data - BreadcrumbList */}
      {Object.keys(breadcrumbSchema).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}

      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Category Header */}
          <div className="mb-6 sm:mb-8">
            <nav className="text-sm text-gray-600 mb-4">
              <a href="/" className="hover:text-green-700">
                Beranda
              </a>
              {' / '}
              <a href="/kategori" className="hover:text-green-700">
                Kategori
              </a>
              {' / '}
              <span className="text-gray-900">{hubData.category.name}</span>
            </nav>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {hubData.category.name}
            </h1>

            {hubData.category.summary && (
              <p className="text-base sm:text-lg text-gray-700 mb-4 leading-relaxed">
                {hubData.category.summary}
              </p>
            )}

            {hubData.category.description && (
              <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{ __html: hubData.category.description }}
                  className="prose prose-sm max-w-none"
                />
              </div>
            )}
          </div>

          {/* Cornerstone Posts Section */}
          {hubData.cornerstone && hubData.cornerstone.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
                Artikel Utama (Cornerstone)
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Artikel lengkap dan komprehensif yang menjadi rujukan utama untuk topik ini.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {hubData.cornerstone.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all"
                  >
                    <div className="p-4 sm:p-5 md:p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          Cornerstone
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        <a
                          href={`/blog/${post.slug}`}
                          className="hover:text-green-700 transition"
                        >
                          {post.title}
                        </a>
                      </h3>
                      {post.excerpt && (
                        <p className="text-sm sm:text-base text-gray-600 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <time className="text-xs sm:text-sm text-gray-500">
                          {typeof post.publishedAt === 'string'
                            ? new Date(post.publishedAt).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : post.publishedAt.toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                        </time>
                        <a
                          href={`/blog/${post.slug}`}
                          className="text-xs sm:text-sm text-green-700 font-medium hover:underline"
                        >
                          Baca →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Articles Section */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
              Artikel Terbaru
            </h2>
            <CategoryHubContent
              cornerstone={hubData.cornerstone}
              articles={hubData.articles}
            />
          </div>

          {/* Pagination */}
          {hubData.pagination && hubData.pagination.totalPages > 1 && (
            <div className="mt-6 sm:mt-8">
              <BlogPagination
                currentPage={hubData.pagination.page}
                totalPages={hubData.pagination.totalPages}
                baseUrl={`/kategori/${params.slug}`}
              />

              {/* Results info */}
              {hubData.pagination.total > 0 && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Menampilkan{' '}
                  {(hubData.pagination.page - 1) * hubData.pagination.limit + 1} -{' '}
                  {Math.min(
                    hubData.pagination.page * hubData.pagination.limit,
                    hubData.pagination.total
                  )}{' '}
                  dari {hubData.pagination.total} artikel
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
