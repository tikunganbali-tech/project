/**
 * STEP 20D-2: Admin Blog Read API
 * GET /api/admin/content/posts/[id]
 * 
 * Purpose: Admin preview untuk blog posts
 * - Role: admin / super_admin
 * - Boleh lihat: status, content, seo metadata
 * - ContentResult summary & outline (jika ada)
 * - Read-only
 * - Tidak trigger engine
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/content/posts/[id] - Admin read-only
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: admin or super_admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch post with ContentResult if exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      include: {
        contentResult: {
          select: {
            id: true,
            summary: true,
            outline: true,
            metrics: true,
            engineVersion: true,
            createdAt: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Build admin response
    const response: any = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoSchema: post.seoSchema,
      primaryKeyword: post.primaryKeyword,
      secondaryKeywords: post.secondaryKeywords,
      wordCount: post.wordCount,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    // Include ContentResult if exists
    if (post.contentResult) {
      response.contentResult = {
        summary: post.contentResult.summary,
        outline: post.contentResult.outline,
        metrics: post.contentResult.metrics,
        engineVersion: post.contentResult.engineVersion,
        createdAt: post.contentResult.createdAt,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching admin blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

