/**
 * PHASE S: Cancel Schedule Blog Post API
 * 
 * POST /api/admin/blog/posts/[id]/cancel-schedule - Cancel scheduled post
 * 
 * Rules (PRINSIP KERAS):
 * - Hanya bisa cancel dari status SCHEDULED atau READY_TO_PUBLISH
 * - Status: SCHEDULED/READY_TO_PUBLISH → CANCELLED
 * - Clear scheduledAt, approvedBy, approvedAt
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// POST /api/admin/blog/posts/[id]/cancel-schedule
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

    const actorId = (session.user as any).id;

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        title: true,
        scheduledAt: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validate status: Can only cancel from SCHEDULED or READY_TO_PUBLISH
    if (post.status !== 'SCHEDULED' && post.status !== 'READY_TO_PUBLISH') {
      return NextResponse.json(
        {
          error: 'Invalid status for cancel',
          reason: `Post status is ${post.status}, can only cancel from SCHEDULED or READY_TO_PUBLISH`,
        },
        { status: 400 }
      );
    }

    const statusBefore = post.status;

    // Update: status → CANCELLED, clear scheduling fields
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        scheduledAt: null,
        approvedBy: null,
        approvedAt: null,
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

    // PHASE S: Audit log - content_schedule_cancelled
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_schedule_cancelled',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            actorId,
            statusBefore,
            statusAfter: 'CANCELLED',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log cancel event:', error);
    }

    return NextResponse.json({
      post: updated,
      message: 'Schedule cancelled successfully. Post status changed to CANCELLED.',
    });
  } catch (error: any) {
    console.error('Error cancelling schedule:', error);
    return NextResponse.json(
      { error: 'Failed to cancel schedule' },
      { status: 500 }
    );
  }
}
