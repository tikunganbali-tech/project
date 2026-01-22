/**
 * PHASE S: Schedule Blog Post API
 * 
 * POST /api/admin/blog/posts/[id]/schedule - Schedule blog post untuk publish di waktu tertentu
 * 
 * Rules (PRINSIP KERAS):
 * - TIDAK ADA AUTO-PUBLISH
 * - Scheduler hanya menyiapkan waktu & status
 * - Publish tetap lewat approval manusia
 * - Status: DRAFT → SCHEDULED
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(), // ISO datetime string
});

// POST /api/admin/blog/posts/[id]/schedule
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
    const body = await request.json();
    const data = scheduleSchema.parse(body);

    // Validate scheduledAt is in the future
    const scheduledDate = new Date(data.scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        title: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validate status transition: Only DRAFT can be scheduled
    if (post.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Invalid status transition',
          reason: `Post status is ${post.status}, can only schedule from DRAFT`,
        },
        { status: 400 }
      );
    }

    // Update: status → SCHEDULED, scheduledAt → provided time
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
        // approvedBy dan approvedAt tetap null (belum disetujui)
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

    // PHASE S: Audit log - content_scheduled
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_scheduled',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            actorId,
            statusBefore: post.status,
            statusAfter: 'SCHEDULED',
            scheduledAt: scheduledDate.toISOString(),
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log schedule event:', error);
    }

    return NextResponse.json({
      post: updated,
      message: 'Post scheduled successfully. It will be marked as READY_TO_PUBLISH when the time arrives, but requires manual approval to publish.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error scheduling blog post:', error);
    return NextResponse.json(
      { error: 'Failed to schedule blog post' },
      { status: 500 }
    );
  }
}
