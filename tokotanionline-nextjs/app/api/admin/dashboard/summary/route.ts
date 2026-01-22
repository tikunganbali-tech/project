/**
 * Admin Dashboard Summary API
 * GET /api/admin/dashboard/summary
 * 
 * Returns real-time summary statistics:
 * - total_products
 * - products_published
 * - total_posts
 * - posts_published
 * - drafts_count
 * - last_publish_at
 * 
 * Requirements:
 * - Response < 300ms (localhost)
 * - Query ringkas (index-aware)
 * - Admin auth required
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw error;
    }

    // Optimized parallel queries (index-aware)
    const [
      totalProducts,
      productsPublished,
      totalPosts,
      postsPublished,
      productsDraft,
      postsDraft,
      lastProductPublish,
      lastPostPublish,
    ] = await Promise.all([
      // Products count
      prisma.product.count().catch(() => 0),
      
      // Products published
      prisma.product.count({
        where: { status: 'PUBLISHED' },
      }).catch(() => 0),
      
      // Posts count
      prisma.blogPost.count().catch(() => 0),
      
      // Posts published
      prisma.blogPost.count({
        where: { status: 'PUBLISHED' },
      }).catch(() => 0),
      
      // Draft products (DRAFT or null)
      prisma.product.count({
        where: {
          OR: [
            { status: 'DRAFT' },
            { status: null },
          ],
        },
      }).catch(() => 0),
      
      // Draft posts
      prisma.blogPost.count({
        where: { status: 'DRAFT' },
      }).catch(() => 0),
      
      // Last product publish time
      prisma.product.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      }).catch(() => null),
      
      // Last post publish time
      prisma.blogPost.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      }).catch(() => null),
    ]);

    // Calculate drafts count (products + posts)
    const draftsCount = productsDraft + postsDraft;

    // Determine last publish time (most recent between products and posts)
    let lastPublishAt: string | null = null;
    const productPublishTime = lastProductPublish?.publishedAt;
    const postPublishTime = lastPostPublish?.publishedAt;
    
    if (productPublishTime && postPublishTime) {
      lastPublishAt = productPublishTime > postPublishTime 
        ? productPublishTime.toISOString()
        : postPublishTime.toISOString();
    } else if (productPublishTime) {
      lastPublishAt = productPublishTime.toISOString();
    } else if (postPublishTime) {
      lastPublishAt = postPublishTime.toISOString();
    }

    const response = {
      total_products: totalProducts,
      products_published: productsPublished,
      total_posts: totalPosts,
      posts_published: postsPublished,
      drafts_count: draftsCount,
      last_publish_at: lastPublishAt,
    };

    const duration = Date.now() - startTime;
    if (duration > 300) {
      logger.warn(`Dashboard summary query took ${duration}ms (target: <300ms)`);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
