/**
 * FITUR 5: Blog Post Unpublish Endpoint
 * 
 * POST /api/admin/blog/posts/[id]/unpublish
 * 
 * Purpose: Unpublish a blog post (change status from PUBLISHED to DRAFT)
 * - Sets status to DRAFT
 * - Clears publishedAt
 * - Logs activity
 * - Only super_admin can unpublish
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    
    // Only super_admin can unpublish
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can unpublish blog posts' },
        { status: 403 }
      );
    }

    // Get post
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Can only unpublish if currently PUBLISHED
    if (post.status !== 'PUBLISHED') {
      return NextResponse.json(
        {
          error: 'Invalid status for unpublish',
          message: `Post status is ${post.status}, can only unpublish from PUBLISHED`,
        },
        { status: 400 }
      );
    }

    const statusBefore = post.status;

    // Update post to DRAFT
    const updatedPost = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'DRAFT',
        publishedAt: null, // Clear publishedAt
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    const actorId = (session.user as any).id;
    await logActivity({
      actorId,
      action: 'UNPUBLISH',
      entityType: 'POST',
      entityId: params.id,
      metadata: {
        title: post.title,
        statusBefore,
        statusAfter: 'DRAFT',
      },
    });

    // Audit log
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_unpublished',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            actorId,
            statusBefore,
            statusAfter: 'DRAFT',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log unpublish event:', error);
    }

    return NextResponse.json({
      post: updatedPost,
      message: 'Post unpublished successfully',
    });
  } catch (error: any) {
    console.error('Error unpublishing blog post:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
