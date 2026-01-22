/**
 * PHASE 3.2: Admin Blog Post Publish API
 * 
 * POST /api/admin/blog/posts/[id]/publish - Publish blog post
 * 
 * Rules:
 * - super_admin ONLY
 * - Can only publish from DRAFT or REVIEW
 * - Sets status → PUBLISHED, publishedAt → now
 * - Slug becomes immutable after publish
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';

// POST /api/admin/blog/posts/[id]/publish - Publish blog post
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

    // super_admin ONLY
    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // M-08: Get idempotency key from request header
    const idempotencyKey = request.headers.get('x-idempotency-key');
    
    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        content: true,
        slug: true,
        title: true,
        categoryId: true,
        seoSchema: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        schedulerKeywordId: true, // M-08
        publishSource: true, // M-08
        category: {
          select: {
            id: true,
            type: true,
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

    // M-08: Guard - Check if scheduler is PROCESSING this content
    if (post.schedulerKeywordId) {
      const keyword = await prisma.scheduleKeyword.findUnique({
        where: { id: post.schedulerKeywordId },
        select: { status: true },
      });
      
      if (keyword && keyword.status === 'PROCESSING') {
        return NextResponse.json(
          {
            error: 'Konten sedang diproses scheduler.',
            message: 'Konten sedang diproses scheduler. Silakan tunggu hingga proses selesai.',
          },
          { status: 409 }
        );
      }
    }

    // M-08: Idempotency check - if already published with same idempotency key, return success
    if (idempotencyKey && post.status === 'PUBLISHED' && post.publishSource === 'MANUAL') {
      // Check if this was a recent publish (within last 5 minutes) - likely same request
      const recentPublish = post.publishedAt && 
        new Date(post.publishedAt).getTime() > Date.now() - 5 * 60 * 1000;
      
      if (recentPublish) {
        return NextResponse.json({
          post,
          message: 'Post already published (idempotent)',
          idempotent: true,
        });
      }
    }

    // PHASE S: Validate - can only publish from READY_TO_PUBLISH (manual approval required)
    // Juga backward compatible: bisa publish dari REVIEW (untuk posts lama)
    if (post.status !== 'READY_TO_PUBLISH' && post.status !== 'REVIEW' && post.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: `Post status is ${post.status}, must be DRAFT, REVIEW, or READY_TO_PUBLISH.`,
        },
        { status: 400 }
      );
    }

    // FITUR 5: Validate category - must have BLOG category
    if (!post.categoryId || !post.category) {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: 'Post must have a category assigned. Please select a BLOG category.',
        },
        { status: 400 }
      );
    }

    // FITUR 5: Validate category type - must be BLOG
    if (post.category.type !== 'BLOG') {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: `Category type is ${post.category.type}, must be BLOG. Please select a BLOG category.`,
        },
        { status: 400 }
      );
    }

    // FITUR 5: Validate content - must not be empty and must contain HTML
    if (!post.content || post.content.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: 'Content is empty. Please add content before publishing.',
        },
        { status: 400 }
      );
    }

    // FITUR 5: Validate content is HTML (should contain HTML tags)
    const hasHtmlTags = /<[^>]+>/.test(post.content);
    if (!hasHtmlTags) {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: 'Content must be in HTML format. Please use the Visual Editor or add HTML tags.',
        },
        { status: 400 }
      );
    }

    // D1: QC Gate - Check if content has QC status and block if FAIL
    // Check seoSchema for QC status (stored during AI generation)
    let qcStatus: string | null = null;
    let qcFailedSections = 0;
    if (post.seoSchema && typeof post.seoSchema === 'object') {
      const schema = post.seoSchema as any;
      qcStatus = schema.qc_status || null;
      qcFailedSections = schema.qc_failed_sections || 0;
    }

    // B2/D1: Hard Gate - Block publish if QC FAIL
    if (qcStatus === 'FAIL') {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: `Quality check failed. ${qcFailedSections} section(s) did not pass QC. Please regenerate or fix the failed sections before publishing.`,
          qc_status: 'FAIL',
          qc_failed_sections: qcFailedSections,
        },
        { status: 400 }
      );
    }

    // D1: Validate SEO fields are filled (hard gate)
    if (!post.seoTitle || post.seoTitle.trim() === '') {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: 'SEO title is required. Please add SEO title before publishing.',
        },
        { status: 400 }
      );
    }

    if (!post.seoDescription || post.seoDescription.trim() === '') {
      return NextResponse.json(
        {
          error: 'Post cannot be published',
          reason: 'SEO description is required. Please add SEO description before publishing.',
        },
        { status: 400 }
      );
    }

    // FASE 2.2: Track status before publish for audit
    const statusBefore = post.status;

    // M-08: Publish: status → PUBLISHED, publishedAt → now, publishSource → MANUAL
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishSource: 'MANUAL', // M-08
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

    // FASE 2.2: Audit log - content_published
    const actorId = (session.user as any).id;
    try {
      await prisma.eventLog.create({
        data: {
          event: 'content_published',
          url: `/admin/blog/posts/${params.id}`,
          meta: {
            postId: params.id,
            actorId,
            statusBefore,
            statusAfter: 'PUBLISHED',
            publishSource: 'MANUAL', // M-08
            idempotencyKey: idempotencyKey || null, // M-08
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log publish event:', error);
    }

    // Activity log
    await logActivity({
      actorId,
      action: 'PUBLISH',
      entityType: 'POST',
      entityId: params.id,
      metadata: {
        title: post.title,
        statusBefore,
        statusAfter: 'PUBLISHED',
        publishSource: 'MANUAL', // M-08
      },
    });

    return NextResponse.json({
      post: updated,
      message: 'Post published successfully',
    });
  } catch (error: any) {
    console.error('Error publishing blog post:', error);
    return NextResponse.json(
      { error: 'Failed to publish blog post' },
      { status: 500 }
    );
  }
}
