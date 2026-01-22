/**
 * FASE 5 — Internal Linking Rules
 * 
 * SEO-safe, deterministic internal linking.
 * Max 1-2 links per content, natural anchor text.
 */

import { prisma } from '@/lib/db';

export interface InternalLinkRule {
  sourceType: 'blog' | 'product' | 'category';
  targetType: 'product' | 'blog';
  maxLinks: number;
  anchorTextStyle: 'natural' | 'keyword' | 'branded';
  enabled: boolean;
}

/**
 * Get internal links for a content piece
 */
export async function getInternalLinks(
  sourceType: 'blog' | 'product',
  sourceId: string,
  maxLinks: number = 2
): Promise<Array<{ url: string; anchorText: string; title: string }>> {
  try {
    // Get rule
    const rule = await prisma.internalLinkRule.findFirst({
      where: {
        sourceType,
        enabled: true,
      },
    });

    if (!rule || rule.maxLinks === 0) {
      return [];
    }

    const limit = Math.min(maxLinks, rule.maxLinks);

    if (sourceType === 'blog') {
      // Blog → Product links
      if (rule.targetType === 'product') {
        // Get products from same category or related
        const blog = await prisma.blog.findUnique({
          where: { id: sourceId },
          select: { categoryId: true },
        });

        if (!blog || !blog.categoryId) {
          return [];
        }

        // Find products in related categories
        const products = await prisma.product.findMany({
          where: {
            status: 'published',
            categoryId: blog.categoryId,
          },
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return products.map((product) => ({
          url: `/produk/${product.slug}`,
          anchorText: product.name, // Natural anchor text
          title: product.name,
        }));
      }
    } else if (sourceType === 'product') {
      // Product → Blog links
      if (rule.targetType === 'blog') {
        const product = await prisma.product.findUnique({
          where: { id: sourceId },
          select: { categoryId: true },
        });

        if (!product || !product.categoryId) {
          return [];
        }

        // Find related blog posts
        const blogs = await prisma.blog.findMany({
          where: {
            status: 'published',
            categoryId: product.categoryId,
          },
          take: limit,
          orderBy: {
            publishedAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        });

        return blogs.map((blog) => ({
          url: `/blog/${blog.slug}`,
          anchorText: blog.title, // Natural anchor text
          title: blog.title,
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('[INTERNAL-LINKING] Error:', error);
    // Fail-safe: return empty array
    return [];
  }
}

/**
 * Initialize default internal link rules
 */
export async function initializeInternalLinkRules(): Promise<void> {
  try {
    // Check if rules exist
    const existing = await prisma.internalLinkRule.findFirst();
    if (existing) {
      return; // Already initialized
    }

    // Create default rules
    await prisma.internalLinkRule.createMany({
      data: [
        {
          sourceType: 'blog',
          targetType: 'product',
          maxLinks: 2,
          anchorTextStyle: 'natural',
          enabled: true,
        },
        {
          sourceType: 'product',
          targetType: 'blog',
          maxLinks: 1,
          anchorTextStyle: 'natural',
          enabled: true,
        },
      ],
    });
  } catch (error) {
    console.error('[INTERNAL-LINKING] Error initializing rules:', error);
  }
}
