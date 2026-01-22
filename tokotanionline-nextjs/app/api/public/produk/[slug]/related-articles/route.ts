/**
 * GET /api/public/produk/[slug]/related-articles
 * 
 * Get related blog articles for a product
 * Query by category + keyword relevance
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Fetch product
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        unifiedCategoryId: true,
        description: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get related articles by category
    const articles = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        unifiedCategoryId: product.unifiedCategoryId || undefined,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        featuredImageUrl: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 6, // Max 6 articles
    });

    // If no articles found by category, try to find by keyword relevance
    if (articles.length === 0 && product.description) {
      // Extract keywords from product description
      const keywords = product.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .slice(0, 5);

      if (keywords.length > 0) {
        // Find articles with similar keywords in title or content
        const keywordArticles = await prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [
              ...keywords.map((keyword) => ({
                title: { contains: keyword, mode: 'insensitive' as const },
              })),
              ...keywords.map((keyword) => ({
                excerpt: { contains: keyword, mode: 'insensitive' as const },
              })),
            ],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            publishedAt: true,
            featuredImageUrl: true,
          },
          orderBy: {
            publishedAt: 'desc',
          },
          take: 6,
        });

        return NextResponse.json({ articles: keywordArticles });
      }
    }

    return NextResponse.json({ articles });
  } catch (error: any) {
    console.error('Error fetching related articles:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
