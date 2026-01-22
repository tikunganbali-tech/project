/**
 * STEP P2A-4: Public Product Detail (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/products/[slug]
 * - ISR revalidate: 300 seconds (5 minutes)
 * - 404 if product not found or not PUBLISHED
 */

import { getPublicProductBySlug } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription, generateBreadcrumbSchema, getProductBreadcrumbs } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductDetail from '@/components/public/ProductDetail';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
  searchParams?: Promise<{ preview?: string }>;
}

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  try {
    // Check for preview mode
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isPreview = referer.includes('preview=true') || false;
    
    const product = await getPublicProductBySlug(params.slug, isPreview);
    const defaults = await getSeoDefaults();

    if (!product) {
      return {
        title: truncateTitle('Produk Tidak Ditemukan - TOKO TANI ONLINE', 60),
        description: truncateMetaDescription(defaults.description, 160),
        alternates: {
          canonical: `${baseUrl}/produk/${params.slug}`,
        },
      };
    }

    const seoTitle = product.seo?.title || product.name || defaults.title;
    const seoDescription = product.seo?.description || 
      truncateMetaDescription(product.description, 160) || 
      defaults.description;

    // PHASE H: OpenGraph dasar (title, image, url)
    const ogImage = product.imageGallery && product.imageGallery.length > 0 
      ? `${baseUrl}${product.imageGallery[0]}` 
      : `${baseUrl}/og-image.jpg`;

    return {
      title: truncateTitle(`${seoTitle} - TOKO TANI ONLINE`, 60),
      description: truncateMetaDescription(seoDescription, 160),
      alternates: {
        canonical: `${baseUrl}/produk/${params.slug}`,
      },
      openGraph: {
        title: truncateTitle(`${seoTitle} - TOKO TANI ONLINE`, 60),
        description: truncateMetaDescription(seoDescription, 160),
        type: 'website',
        url: `${baseUrl}/produk/${params.slug}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: product.name || 'Product Image',
          },
        ],
      },
      ...(product.seo?.schemaJson && {
        other: {
          'application/ld+json': product.seo.schemaJson,
        },
      }),
    };
  } catch (error) {
    // Defensive: return safe metadata on error dengan SEO Global fallback
    console.error('❌ [generateMetadata] Error generating product metadata:', error);
    const defaults = await getSeoDefaults();
    return {
      title: truncateTitle('Produk - TOKO TANI ONLINE', 60),
      description: truncateMetaDescription(defaults.description, 160),
      alternates: {
        canonical: `${baseUrl}/produk/${params.slug}`,
      },
    };
  }
}

export default async function ProductDetailPage({ 
  params,
  searchParams,
}: ProductDetailPageProps) {
  // Check for preview mode
  const resolvedSearchParams = await searchParams;
  const isPreview = resolvedSearchParams?.preview === 'true';
  
  // If preview mode, require authentication
  if (isPreview) {
    const { getServerSession } = await import('@/lib/auth');
    const session = await getServerSession();
    
    if (!session || !session.user) {
      notFound(); // Don't reveal that preview exists
    }
    
    // Check if user has admin access
    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      notFound(); // Don't reveal that preview exists
    }
  }
  
  // Fetch product from public API (with preview mode if enabled)
  const product = await getPublicProductBySlug(params.slug, isPreview);

  // 404 if product not found or (not PUBLISHED and not preview)
  if (!product) {
    notFound();
  }

  // PHASE C2: Use API data directly - no fallbacks, API contract guarantees these fields
  // FASE 6.1: Generate breadcrumb structured data
  const breadcrumbs = getProductBreadcrumbs(product.name, product.slug);
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
      
      <Navbar siteSettings={undefined} />
      <ProductDetail 
        id={product.id}
        name={product.name}
        slug={product.slug}
        description={product.description}
        imageGallery={product.imageGallery}
        priceResolved={product.priceResolved}
        shopeeUrl={product.shopeeUrl}
        tokopediaUrl={product.tokopediaUrl}
        category={product.category}
        additionalInfo={product.additionalInfo}
      />
      <Footer siteSettings={undefined} />
    </>
  );
}
