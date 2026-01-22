/**
 * STEP 20D-3: Admin Publish API (Manual Only)
 * POST /api/admin/content/posts/[id]/publish
 * 
 * Purpose: Manual publish untuk blog posts
 * - Role: super_admin only
 * - Hanya bisa publish jika: status = DRAFT, content tidak kosong
 * - Set: status → PUBLISHED, publishedAt → now
 * - Tidak trigger engine
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// POST /api/admin/content/posts/[id]/publish - Manual publish
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Fetch current post
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        content: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validate: status must be DRAFT
    if (post.status !== 'DRAFT') {
      return NextResponse.json(
        { 
          error: 'Post cannot be published',
          reason: `Post status is ${post.status}, must be DRAFT`,
        },
        { status: 400 }
      );
    }

    // Validate: content must not be empty
    if (!post.content || post.content.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Post cannot be published',
          reason: 'Content is empty',
        },
        { status: 400 }
      );
    }

    // Update post: status → PUBLISHED, publishedAt → now
    const updatedPost = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    });

    logger.info(`Post published: ${updatedPost.id} by super_admin ${(session.user as any)?.id}`, {
      postId: updatedPost.id,
      adminId: (session.user as any)?.id,
    });

    return NextResponse.json({
      post: updatedPost,
      message: 'Post published successfully',
    });
  } catch (error: any) {
    logger.error('Error publishing post:', error);
    return NextResponse.json(
      { error: 'Failed to publish post' },
      { status: 500 }
    );
  }
}

