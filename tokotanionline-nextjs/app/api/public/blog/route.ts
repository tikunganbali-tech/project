/**
 * STEP P2A-7: Public Blog List API (READ-ONLY) - WITH PAGINATION
 * GET /api/public/blog
 * 
 * Purpose: Public read-only API untuk blog posts listing dengan pagination
 * - Hanya status = PUBLISHED
 * - Pagination support (page, limit)
 * - Tidak include: status, engine metadata, job/result data
 * - SEO-friendly untuk crawlers
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 20)
 * 
 * Response:
 * {
 *   items: [{ id, title, slug, excerpt, publishedAt }],
 *   pagination: { page, limit, total, totalPages }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PostStatus } from '@prisma/client';
import { BlogListResponseSchema, validateApiResponse } from '@/lib/api-response-schemas';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20); // Max 20 per page

    // Build where clause
    const where = {
      status: PostStatus.PUBLISHED,
    };

    // Get total count for pagination (defensive)
    const total = await prisma.blogPost.count({ where }).catch(() => 0);

    // Fetch published blog posts with pagination (defensive)
    const posts = await prisma.blogPost.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    }).catch(() => []);

    // Calculate total pages (defensive)
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    // Build response (guaranteed safe)
    const response = {
      items: posts || [],
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
        BlogListResponseSchema,
        'GET /api/public/blog'
      );

      // Return with cache headers
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      console.error('[API-VALIDATION] Blog list response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching public blog posts:', error);
    // Return 200 with empty state, not 500
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);
    
    return NextResponse.json(
      {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      },
      { status: 200 }
    );
  }
}
