/**
 * PHASE S: Approve Blog Post for Publishing API
 * 
 * POST /api/admin/blog/posts/[id]/approve - Approve blog post untuk publish
 * 
 * Rules (PRINSIP KERAS):
 * - MANUSIA = PEMUTUS AKHIR
 * - Approve hanya bisa dari status SCHEDULED atau READY_TO_PUBLISH
 * - Status: SCHEDULED/READY_TO_PUBLISH → READY_TO_PUBLISH (mark as ready)
 * - Set approvedBy dan approvedAt
 * - Publish TETAP harus manual action terpisah (tidak auto)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// POST /api/admin/blog/posts/[id]/approve
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
    // Approve requires content.manage permission (admin level)
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const approverId = (session.user as any).id;

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        title: true,
        scheduledAt: true,
        content: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validate status: Can only approve from SCHEDULED or READY_TO_PUBLISH
    if (post.status !== 'SCHEDULED' && post.status !== 'READY_TO_PUBLISH') {
      return NextResponse.json(
        {
          error: 'Invalid status for approval',
          reason: `Post status is ${post.status}, can only approve from SCHEDULED or READY_TO_PUBLISH`,
        },
        { status: 400 }
      );
    }

    // Validate content is not empty
    if (!post.content || post.content.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Post cannot be approved',
          reason: 'Content is empty',
        },
        { status: 400 }
      );
    }

    const statusBefore = post.status;

    // Update: status → READY_TO_PUBLISH, approvedBy → current admin, approvedAt → now
    // PENTING: Tidak publish otomatis, hanya mark sebagai ready
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'READY_TO_PUBLISH',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // PHASE S: Audit log - content_approved
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_approved',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            approverId,
            statusBefore,
            statusAfter: 'READY_TO_PUBLISH',
            scheduledAt: post.scheduledAt?.toISOString() || null,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log approval event:', error);
    }

    return NextResponse.json({
      post: updated,
      message: 'Post approved and ready to publish. Use the publish endpoint to actually publish it.',
    });
  } catch (error: any) {
    console.error('Error approving blog post:', error);
    return NextResponse.json(
      { error: 'Failed to approve blog post' },
      { status: 500 }
    );
  }
}
