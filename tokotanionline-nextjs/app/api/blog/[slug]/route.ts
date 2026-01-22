/**
 * STEP 20D-1: Public Blog Read API
 * GET /api/blog/[slug]
 * 
 * Purpose: Public read-only API untuk blog posts
 * - Hanya status = PUBLISHED
 * - 404 jika slug tidak ada atau status ≠ PUBLISHED
 * - Response include: title, content, excerpt, seoTitle, seoDescription, schemaJson, publishedAt
 * - Tidak include: status, engine metadata, job/result data
 * - SEO-friendly untuk crawlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/blog/[slug] - Public read-only
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Fetch blog post by slug (slug is not unique alone, use findFirst)
    const post = await prisma.blogPost.findFirst({
      where: { slug: params.slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        seoSchema: true, // This is the schemaJson field
        publishedAt: true,
        status: true, // Need to check status, but won't include in response
      },
    });

    // 404 if post doesn't exist
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 404 if status is not PUBLISHED
    if (post.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Build public response (exclude status and engine metadata)
    const response = {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      schemaJson: post.seoSchema, // Map seoSchema to schemaJson for consistency
      publishedAt: post.publishedAt,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching public blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

