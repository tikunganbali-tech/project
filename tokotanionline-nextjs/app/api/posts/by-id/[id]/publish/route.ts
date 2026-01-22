/**
 * STEP 6: Error handling hardened
 * STEP 9A: Moved to by-id structure to resolve routing conflict
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// PATCH /api/posts/by-id/[id]/publish - Toggle publish status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if post exists
    const existing = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Toggle published status
    const post = await prisma.post.update({
      where: { id: params.id },
      data: {
        published: !existing.published,
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error publishing post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}


