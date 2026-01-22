import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { PRODUCT_STATUS } from '@/lib/product-rules';

/**
 * FASE 6.1 — Sitemap Generator
 * 
 * Includes:
 * - / (homepage)
 * - /produk & /produk/[slug] (Product & CatalogProduct)
 * - /blog & /blog/[slug]
 * - /tentang-kami
 * - /kontak
 * 
 * Excludes: DRAFT, ARCHIVED, non-published content
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

  try {
    // FASE 6.1: Get published BlogPost only (status = PUBLISHED)
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
      },
      select: {
        slug: true,
        publishedAt: true,
        updatedAt: true,
      },
    }).catch(() => [] as Array<{ slug: string; publishedAt: Date | null; updatedAt: Date }>);

    // FASE 6.1: Get published products only
    const products = await prisma.product.findMany({
      where: {
        status: PRODUCT_STATUS.PUBLISHED,
        isActive: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }).catch(() => [] as Array<{ slug: string; updatedAt: Date }>);

    // FASE 6.1: Get published catalog products only
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: {
        published: true,
      },
      select: {
        slug: true,
        createdAt: true,
      },
    }).catch(() => [] as Array<{ slug: string; createdAt: Date }>);

    // PHASE H: Get published categories only
    const categories = await prisma.productCategory.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    }).catch(() => [] as Array<{ slug: string; updatedAt: Date }>);

    // Base URLs - PHASE 3.4.1: Include all public routes
    const urls: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/produk`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/search`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/tentang-kami`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/kontak`,
        lastModified: new Date(),
      },
    ];

    // PHASE 3.4.1: Add published blog posts
    blogPosts.forEach((post) => {
      urls.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.publishedAt || post.updatedAt || new Date(),
      });
    });

    // FASE 6.1: Add published products - Use /produk route
    products.forEach((product) => {
      urls.push({
        url: `${baseUrl}/produk/${product.slug}`,
        lastModified: product.updatedAt || new Date(),
      });
    });

    // FASE 6.1: Add published catalog products - Use /products route
    catalogProducts.forEach((product) => {
      urls.push({
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: product.createdAt || new Date(),
      });
    });

    // PHASE H: Add published categories
    categories.forEach((category) => {
      urls.push({
        url: `${baseUrl}/kategori/${category.slug}`,
        lastModified: category.updatedAt || new Date(),
      });
    });

    return urls;
  } catch (error) {
    console.error('❌ [sitemap] Error generating sitemap:', error);
    // PHASE 3.4.1: Fallback to base URLs (defensive)
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/produk`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/search`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/tentang-kami`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/kontak`,
        lastModified: new Date(),
      },
    ];
  }
}
