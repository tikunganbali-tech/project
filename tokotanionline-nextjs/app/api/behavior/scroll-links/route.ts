/**
 * Behavior Loop API - Scroll Links
 * Get internal links based on scroll depth and intent keywords
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logEngineActivity } from '@/lib/engine-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType') as 'blog' | 'product' | 'home';
    const pageId = searchParams.get('pageId');
    const scrollDepth = parseInt(searchParams.get('scrollDepth') || '40');
    const categoryId = searchParams.get('categoryId');
    const keyword = searchParams.get('keyword');

    if (!pageType || !pageId) {
      return NextResponse.json({ error: 'pageType and pageId are required' }, { status: 400 });
    }

    const links: Array<{ text: string; url: string; type: 'internal' | 'product' | 'article' }> = [];

    // 40% scroll → contextual internal links
    if (scrollDepth >= 40 && scrollDepth < 70) {
      if (pageType === 'blog') {
        // Get related blogs based on category or keyword intent
        const where: any = {
          status: 'published',
          id: { not: pageId },
        };

        if (categoryId) {
          where.categoryId = categoryId;
        }

        // Try to find blogs with similar keywords
        if (keyword) {
          const keywordMappings = await prisma.seoKeywordMapping.findMany({
            where: {
              keyword: { contains: keyword, mode: 'insensitive' },
              pageType: 'blog',
            },
            take: 5,
            select: { pageId: true },
          });

          const relatedIds = keywordMappings.map((km) => km.pageId).filter(Boolean);
          if (relatedIds.length > 0) {
            where.id = { in: relatedIds, not: pageId };
          }
        }

        const relatedBlogs = await prisma.blog.findMany({
          where,
          take: 3,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        });

        links.push(
          ...relatedBlogs.map((blog) => ({
            text: blog.title,
            url: `/blog/${blog.slug}`,
            type: 'article' as const,
          }))
        );
      } else if (pageType === 'product') {
        // Get related products based on category
        if (categoryId) {
          const relatedProducts = await prisma.product.findMany({
            where: {
              isActive: true,
              categoryId,
              id: { not: pageId },
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          links.push(
            ...relatedProducts.map((product) => ({
              text: product.name,
              url: `/produk/${product.slug}`,
              type: 'product' as const,
            }))
          );
        }

        // Also get related educational blogs
        const educationalBlogs = await prisma.blog.findMany({
          where: {
            status: 'published',
            ...(categoryId ? { categoryId } : {}),
          },
          take: 2,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        });

        links.push(
          ...educationalBlogs.map((blog) => ({
            text: blog.title,
            url: `/blog/${blog.slug}`,
            type: 'article' as const,
          }))
        );
      }
    }

    // Log to EngineLog
    await logEngineActivity('user-behavior', {
      actionType: 'execute',
      moduleName: 'getScrollLinks',
      status: 'success',
      message: `Generated ${links.length} scroll links for ${pageType}:${pageId} at ${scrollDepth}%`,
      relatedEntityId: pageId || undefined,
      relatedEntityType: pageType as 'blog' | 'product' | 'page',
      metadata: {
        scrollDepth,
        linksCount: links.length,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
      },
      dataProcessedCount: links.length,
    });

    return NextResponse.json({ links });
  } catch (error: any) {
    console.error('Error getting scroll links:', error);
    await logEngineActivity('user-behavior', {
      actionType: 'error',
      moduleName: 'getScrollLinks',
      status: 'failed',
      message: `Failed to get scroll links: ${error.message}`,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

