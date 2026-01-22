/**
 * STEP P2A-6: Public Blog Detail (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/blog/[slug]
 * - ISR revalidate: 300 seconds (5 minutes)
 * - 404 if post not found or not PUBLISHED
 * - Full SEO support (metadata + schema)
 */

import { getPublicBlogBySlug } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription, generateBreadcrumbSchema, getBlogBreadcrumbs } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogArticle from '@/components/public/BlogArticle';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

interface BlogDetailPageProps {
  params: {
    slug: string;
  };
}

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  try {
    const post = await getPublicBlogBySlug(params.slug);
    const defaults = await getSeoDefaults();

    // Defensive: return safe metadata dengan SEO Global fallback jika post not found
    if (!post) {
      return {
        title: truncateTitle(defaults.title, 60),
        description: truncateMetaDescription(defaults.description, 160),
        alternates: {
          canonical: `${baseUrl}/blog/${params.slug}`,
        },
      };
    }

    const seoTitle = post.seo?.title || post.title || defaults.title;
    const seoDescription = post.seo?.description || 
      truncateMetaDescription(post.excerpt, 160) || 
      defaults.description;

    // PHASE H: OpenGraph dasar (title, image, url)
    const ogImage = `${baseUrl}/og-image.jpg`; // Default OG image

    return {
      title: truncateTitle(seoTitle, 60),
      description: truncateMetaDescription(seoDescription, 160),
      alternates: {
        canonical: `${baseUrl}/blog/${params.slug}`,
      },
      openGraph: {
        title: truncateTitle(seoTitle, 60),
        description: truncateMetaDescription(seoDescription, 160),
        type: 'article',
        url: `${baseUrl}/blog/${params.slug}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: post.title || 'Blog Post',
          },
        ],
      },
      ...(post.seo?.schemaJson && {
        other: {
          'application/ld+json': post.seo.schemaJson,
        },
      }),
    };
  } catch (error) {
    // Defensive: return safe metadata dengan SEO Global fallback on error
    console.error('Error generating metadata for blog post:', error);
    const defaults = await getSeoDefaults();
    return {
      title: truncateTitle(defaults.title, 60),
      description: truncateMetaDescription(defaults.description, 160),
      alternates: {
        canonical: `${baseUrl}/blog/${params.slug}`,
      },
    };
  }
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  // Fetch blog post from public API
  const post = await getPublicBlogBySlug(params.slug);

  // 404 if post not found or not PUBLISHED
  if (!post) {
    notFound();
  }

  // FASE 6.1: Generate breadcrumb structured data
  const breadcrumbs = getBlogBreadcrumbs(post.title, params.slug);
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
      <BlogArticle
        title={post.title}
        content={post.content}
        contentMode={post.contentMode || 'HTML'} // M-07
        publishedAt={post.publishedAt}
        slug={params.slug}
        faq={post.faq}
        relatedProducts={post.relatedProducts}
      />
      <Footer />
    </>
  );
}
