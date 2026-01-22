/**
 * PHASE 3.2: Admin Blog Post Archive API
 * 
 * POST /api/admin/blog/posts/[id]/archive - Archive blog post
 * 
 * Rules:
 * - Admin & super_admin
 * - Can archive from any status
 * - Sets status → ARCHIVED
 * - Does not delete, just hides from public
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// POST /api/admin/blog/posts/[id]/archive - Archive blog post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth & permission check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // FASE 2.2: Track status before archive for audit
    const statusBefore = post.status;

    // Archive: can archive from any status
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
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

    // FASE 2.2: Audit log - content_archived
    const actorId = (session.user as any).id;
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_archived',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            actorId,
            statusBefore,
            statusAfter: 'ARCHIVED',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log archive event:', error);
    }

    return NextResponse.json({
      post: updated,
      message: 'Post archived successfully',
    });
  } catch (error: any) {
    console.error('Error archiving blog post:', error);
    return NextResponse.json(
      { error: 'Failed to archive blog post' },
      { status: 500 }
    );
  }
}
