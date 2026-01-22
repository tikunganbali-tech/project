/**
 * FASE 7.2: Public Category Hub API (READ-ONLY)
 * GET /api/public/categories/[slug]
 * 
 * Purpose: Public read-only API untuk category hub page
 * - Menampilkan informasi kategori (name, description, summary)
 * - Menampilkan cornerstone posts di kategori ini
 * - Menampilkan featured articles (derived posts)
 * - Pagination support untuk articles
 * - Hanya status = PUBLISHED
 * - Sesuai FASE 7.2.1 - Kategori sebagai HUB
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 20)
 * 
 * Response:
 * {
 *   category: { id, name, slug, description, summary },
 *   cornerstone: [{ id, title, slug, excerpt, publishedAt }], // Cornerstone posts
 *   articles: [{ id, title, slug, excerpt, publishedAt }], // Regular articles (pagination)
 *   pagination: { page, limit, total, totalPages }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PostStatus } from '@prisma/client';
import { CategoryHubSchema, validateApiResponse } from '@/lib/api-response-schemas';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

    // Fetch category by slug (defensive)
    const category = await prisma.contentCategory.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        summary: true,
        type: true,
      },
    }).catch(() => null);

    // 404 if category doesn't exist or is inactive
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Fetch cornerstone posts in this category (defensive)
    const cornerstonePosts = await prisma.blogPost.findMany({
      where: {
        categoryId: category.id,
        status: PostStatus.PUBLISHED,
        isCornerstone: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 5, // Max 5 cornerstone posts
    }).catch(() => []);

    // Build where clause for regular articles (non-cornerstone)
    const where = {
      categoryId: category.id,
      status: PostStatus.PUBLISHED,
      isCornerstone: false, // Regular articles only
    };

    // Get total count for pagination (defensive)
    const total = await prisma.blogPost.count({ where }).catch(() => 0);

    // Fetch regular articles with pagination (defensive)
    const articles = await prisma.blogPost.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        cornerstoneId: true, // Include to show if linked to cornerstone
      },
      orderBy: {
        publishedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }).catch(() => []);

    // Calculate total pages (defensive)
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    // Build response (guaranteed safe)
    const response = {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        summary: category.summary || null,
        type: category.type,
      },
      cornerstone: cornerstonePosts || [],
      articles: articles || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages,
      },
    };

    // PHASE B: Validate response schema before returning
    try {
      const validatedResponse = validateApiResponse(
        response,
        CategoryHubSchema,
        `GET /api/public/categories/${params.slug}`
      );

      // Return with cache headers
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      console.error('[API-VALIDATION] Category hub response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching public category hub:', error);
    // Return 404 for not found, not 500
    return NextResponse.json(
      { error: 'Category not found' },
      { status: 404 }
    );
  }
}
