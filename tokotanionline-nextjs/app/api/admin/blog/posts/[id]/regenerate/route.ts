/**
 * POST /api/admin/blog/posts/[id]/regenerate
 * 
 * Regenerate blog content using AI
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

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
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch blog post
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        unifiedCategoryId: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    if (!post.unifiedCategoryId) {
      return NextResponse.json(
        { error: 'Blog post must have a category to regenerate' },
        { status: 400 }
      );
    }

    // Call AI generation endpoint
    // This will be handled by redirecting to the AI generate endpoint
    // For now, return a message indicating regeneration should be done via the form
    return NextResponse.json({
      message: 'Regeneration initiated. Use the AI generate feature in the edit form.',
      redirect: `/admin/blog/posts/${params.id}/edit`,
    });
  } catch (error: any) {
    console.error('Error regenerating blog:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
