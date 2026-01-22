/**
 * PHASE 1: Public Categories List API (READ-ONLY)
 * GET /api/public/categories?context=product|blog
 * 
 * Purpose: Public read-only API untuk list kategori aktif dengan context filter
 * - Menampilkan kategori aktif berdasarkan context (product/blog)
 * - Untuk navigation, sitemap, dan frontend filters
 * 
 * Response:
 * {
 *   categories: [{ id, name, slug, type, level, parentId }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CategoryListResponseSchema, validateApiResponse } from '@/lib/api-response-schemas';
import { getCategoriesByContext, CategoryContextType } from '@/lib/unified-category-utils';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = (searchParams.get('context') || 'product') as CategoryContextType;

    // Fetch categories filtered by context (defensive)
    const categories = await getCategoriesByContext(context, {
      isActive: true,
      includeInactive: false,
    }).catch(() => []);

    // Build response (guaranteed safe)
    const response = {
      categories: (categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        level: cat.level,
        parentId: cat.parentId,
      })),
    };

    // PHASE B: Validate response schema before returning
    try {
      const validatedResponse = validateApiResponse(
        response,
        CategoryListResponseSchema,
        'GET /api/public/categories'
      );

      // Return with cache headers
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      console.error('[API-VALIDATION] Category list response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching public categories:', error);
    // Return 200 with empty state, not 500
    return NextResponse.json(
      {
        categories: [],
      },
      { status: 200 }
    );
  }
}
