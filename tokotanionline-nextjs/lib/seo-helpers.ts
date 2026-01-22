/**
 * FASE 6.1 — SEO HELPERS
 * 
 * Utility functions untuk SEO Authority Layer
 * - On-page meta generation
 * - Structured data (JSON-LD)
 * - Fallback ke SEO Global
 * 
 * Prinsip:
 * - Performance-first (no heavy computation)
 * - Deterministic fallbacks
 * - No automation/AI
 */

import { getPublicSiteSettings } from '@/lib/site-settings';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

/**
 * Truncate text untuk meta description (max 160 chars)
 */
export function truncateMetaDescription(text: string | null | undefined, maxLength: number = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Truncate text untuk title (max 60 chars)
 * PHASE 2: Disabled jika TEXT_MUTATORS_DISABLED=true
 */
export function truncateTitle(text: string | null | undefined, maxLength: number = 60): string {
  // PHASE 2: Check if mutators disabled
  if (process.env.NEXT_PUBLIC_DISABLE_TEXT_MUTATORS === 'true') {
    // Return original text, no truncation
    return text || '';
  }
  
  // Legacy behavior
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get SEO Global defaults dari Website Settings
 */
export async function getSeoDefaults(): Promise<{
  title: string;
  description: string;
}> {
  const settings = await getPublicSiteSettings();
  
  return {
    title: truncateTitle(settings?.defaultMetaTitle || settings?.siteTitle || 'Toko Tani Online', 60),
    description: truncateMetaDescription(
      settings?.defaultMetaDescription || 
      settings?.tagline || 
      'Platform Pertanian Terpercaya',
      160
    ),
  };
}

/**
 * Generate Organization JSON-LD
 */
export async function generateOrganizationSchema(): Promise<object> {
  const settings = await getPublicSiteSettings();
  const siteTitle = settings?.siteTitle || 'Toko Tani Online';
  const logoUrl = settings?.logoLight || settings?.logoUrl || `${baseUrl}/logo.png`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteTitle,
    url: baseUrl,
    logo: logoUrl,
    // sameAs: [] // Optional - bisa ditambahkan jika ada social media
  };
}

/**
 * Generate WebSite JSON-LD
 */
export async function generateWebSiteSchema(): Promise<object> {
  const settings = await getPublicSiteSettings();
  const siteTitle = settings?.siteTitle || 'Toko Tani Online';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteTitle,
    url: baseUrl,
    // potentialAction: { // Optional - jika ada search functionality
    //   '@type': 'SearchAction',
    //   target: `${baseUrl}/search?q={search_term_string}`,
    //   'query-input': 'required name=search_term_string',
    // },
  };
}

/**
 * Generate BreadcrumbList JSON-LD
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  if (items.length === 0) {
    return {};
  }

  const breadcrumbItems = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };
}

/**
 * Generate breadcrumb items untuk produk (with category tree)
 */
export async function getProductBreadcrumbsWithCategory(
  productName: string,
  productSlug: string,
  categoryId: string | null
): Promise<Array<{ name: string; url: string }>> {
  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Beranda', url: baseUrl },
    { name: 'Produk', url: `${baseUrl}/produk` },
  ];

  // Add category tree if available
  if (categoryId) {
    try {
      const { getCategoryWithParentChain } = await import('@/lib/unified-category-utils');
      const categoryWithChain = await getCategoryWithParentChain(categoryId);
      
      // Add parent categories
      categoryWithChain.parentChain.forEach((parent) => {
        breadcrumbs.push({
          name: parent.name,
          url: `${baseUrl}/kategori/${parent.slug}`,
        });
      });
      
      // Add current category
      breadcrumbs.push({
        name: categoryWithChain.name,
        url: `${baseUrl}/kategori/${categoryWithChain.slug}`,
      });
    } catch (error) {
      console.error('Error fetching category tree for breadcrumb:', error);
      // Continue without category breadcrumbs
    }
  }

  // Add product
  breadcrumbs.push({
    name: productName,
    url: `${baseUrl}/produk/${productSlug}`,
  });

  return breadcrumbs;
}

/**
 * Generate breadcrumb items untuk produk (fallback - no category)
 */
export function getProductBreadcrumbs(productName: string, productSlug: string): Array<{ name: string; url: string }> {
  return [
    { name: 'Beranda', url: baseUrl },
    { name: 'Produk', url: `${baseUrl}/produk` },
    { name: productName, url: `${baseUrl}/produk/${productSlug}` },
  ];
}

/**
 * Generate breadcrumb items untuk blog (with category tree)
 */
export async function getBlogBreadcrumbsWithCategory(
  postTitle: string,
  postSlug: string,
  categoryId: string | null
): Promise<Array<{ name: string; url: string }>> {
  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Beranda', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
  ];

  // Add category tree if available
  if (categoryId) {
    try {
      const { getCategoryWithParentChain } = await import('@/lib/unified-category-utils');
      const categoryWithChain = await getCategoryWithParentChain(categoryId);
      
      // Add parent categories
      categoryWithChain.parentChain.forEach((parent) => {
        breadcrumbs.push({
          name: parent.name,
          url: `${baseUrl}/kategori/${parent.slug}`,
        });
      });
      
      // Add current category
      breadcrumbs.push({
        name: categoryWithChain.name,
        url: `${baseUrl}/kategori/${categoryWithChain.slug}`,
      });
    } catch (error) {
      console.error('Error fetching category tree for breadcrumb:', error);
      // Continue without category breadcrumbs
    }
  }

  // Add blog post
  breadcrumbs.push({
    name: postTitle,
    url: `${baseUrl}/blog/${postSlug}`,
  });

  return breadcrumbs;
}

/**
 * Generate breadcrumb items untuk blog (fallback - no category)
 */
export function getBlogBreadcrumbs(postTitle: string, postSlug: string): Array<{ name: string; url: string }> {
  return [
    { name: 'Beranda', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
    { name: postTitle, url: `${baseUrl}/blog/${postSlug}` },
  ];
}
