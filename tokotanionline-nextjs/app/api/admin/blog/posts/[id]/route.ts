/**
 * PHASE 3.2: Admin Blog Post Update API
 * 
 * PUT /api/admin/blog/posts/[id] - Update blog post
 * 
 * Rules:
 * - Admin & super_admin only
 * - Slug immutable after PUBLISHED
 * - Status transitions: DRAFT → REVIEW → PUBLISHED → ARCHIVED
 * - Can move to REVIEW (any admin)
 * - Cannot publish here (use /publish endpoint)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';
import { ensureSEO } from '@/lib/seo-utils';
import { sanitizeHTML, inferContentMode } from '@/lib/html-sanitizer';
import { z } from 'zod';

const blogPostUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  contentMode: z.enum(['TEXT', 'HTML']).optional(), // M-07
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'ARCHIVED']).optional(), // Cannot set PUBLISHED here
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  scheduledAt: z.string().optional().nullable(), // FASE 2.2: Scheduling
  // LAST LOCK: Required fields
  unifiedCategoryId: z.string().optional().nullable(),
  intentType: z.string().optional().nullable(),
  articleStatus: z.enum(['DRAFT', 'GENERATED', 'VALIDATED']).optional(),
});

// PUT /api/admin/blog/posts/[id] - Update blog post
export async function PUT(
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
    const existing = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        slug: true,
        publishedAt: true,
        seoTitle: true,
        seoDescription: true,
        primaryKeyword: true,
        contentMode: true, // M-07
        content: true, // M-07: For backward compatibility
        schedulerKeywordId: true, // M-08
        publishSource: true, // M-08
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // M-08: Guard - Check if scheduler is PROCESSING this content
    if (existing.schedulerKeywordId) {
      const keyword = await prisma.scheduleKeyword.findUnique({
        where: { id: existing.schedulerKeywordId },
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

    const body = await request.json();
    const data = blogPostUpdateSchema.parse(body);

    // Slug immutability check: cannot change slug if PUBLISHED
    if (data.slug && data.slug !== existing.slug) {
      if (existing.status === 'PUBLISHED') {
        return NextResponse.json(
          { error: 'Cannot change slug after publication' },
          { status: 400 }
        );
      }

      // Check new slug uniqueness
      const slugExists = await prisma.blogPost.findFirst({
        where: {
          slug: data.slug,
          id: { not: params.id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Status transition validation
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['REVIEW', 'ARCHIVED'],
        REVIEW: ['DRAFT', 'ARCHIVED'],
        PUBLISHED: ['ARCHIVED'], // Can only archive published posts
        ARCHIVED: ['DRAFT'], // Can unarchive to draft
      };

      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          {
            error: 'Invalid status transition',
            currentStatus: existing.status,
            requestedStatus: data.status,
            allowedTransitions: allowed,
          },
          { status: 400 }
        );
      }
    }

    // M-06: Ensure SEO is always filled (auto-generate if empty)
    // Use existing values if not provided in update, otherwise use new values
    const currentSeoTitle = data.seoTitle !== undefined ? data.seoTitle : existing.seoTitle;
    const currentSeoDescription = data.seoDescription !== undefined ? data.seoDescription : existing.seoDescription;
    const currentPrimaryKeyword = data.primaryKeyword !== undefined ? data.primaryKeyword : existing.primaryKeyword;
    
    // Determine if SEO was manually edited (if user provided SEO values explicitly)
    const isManualEdit = data.seoTitle !== undefined || data.seoDescription !== undefined;
    
    const seoResult = ensureSEO({
      seoTitle: currentSeoTitle,
      seoDescription: currentSeoDescription,
      primaryKeyword: currentPrimaryKeyword,
      seoManual: isManualEdit && !!(currentSeoTitle && currentSeoDescription), // Manual if user provided both
    });

    // M-07: Determine contentMode (use provided, existing, or infer)
    let contentMode = data.contentMode;
    if (!contentMode && existing.contentMode) {
      contentMode = existing.contentMode as 'TEXT' | 'HTML';
    } else if (!contentMode && data.content) {
      // Backward compatibility: infer from content if not provided
      contentMode = inferContentMode(data.content);
    } else if (!contentMode) {
      // Fallback to existing or default
      contentMode = (existing.contentMode as 'TEXT' | 'HTML') || 'HTML';
    }
    
    // M-07: Sanitize HTML if mode is HTML
    let finalContent = data.content;
    if (data.content && contentMode === 'HTML') {
      finalContent = sanitizeHTML(data.content);
    }

    // Build update data
    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.slug && data.slug !== existing.slug) updateData.slug = data.slug;
    if (data.content) updateData.content = finalContent;
    if (data.contentMode !== undefined || !existing.contentMode) {
      updateData.contentMode = contentMode; // M-07: Always set contentMode
    }
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.status) updateData.status = data.status;
    // M-06: Always set SEO (auto-generated if empty)
    updateData.seoTitle = seoResult.seoTitle || null;
    updateData.seoDescription = seoResult.seoDescription || null;
    if (data.seoKeywords !== undefined) updateData.seoKeywords = data.seoKeywords;
    if (data.primaryKeyword !== undefined) updateData.primaryKeyword = data.primaryKeyword;
    if (data.secondaryKeywords !== undefined) updateData.secondaryKeywords = data.secondaryKeywords;
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    
    // M-08: Set publishSource to MANUAL for manual saves (if not already set by scheduler)
    if (!existing.publishSource || existing.publishSource !== 'SCHEDULER') {
      updateData.publishSource = 'MANUAL';
    }

    // LAST LOCK: Save category and intent
    if (data.unifiedCategoryId !== undefined) {
      updateData.unifiedCategoryId = data.unifiedCategoryId;
    }
    if (data.intentType !== undefined) {
      updateData.intentType = data.intentType;
    }
    // Note: articleStatus is not stored in DB, it's computed from status and other fields
    // But we can store it in seoSchema metadata if needed

    // FASE 2.2: Track status change for audit
    const statusBefore = existing.status;
    const statusAfter = data.status || existing.status;
    const statusChanged = data.status && data.status !== existing.status;

    // Update post
    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: updateData,
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

    // EKSEKUSI: Emit POST_GENERATION_COMPLETE event after blog post is saved
    // This happens after AI generation when content & images are saved
    // Check if this is an AI-generated post (has content and images)
    if (data.content && updated.content) {
      try {
        const ENGINE_HUB_URL = process.env.AI_ENGINE_URL || process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
        
        // Emit event to Go engine
        await fetch(`${ENGINE_HUB_URL}/api/v2/events/post-generation-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'blog',
            entity_id: params.id,
          }),
        }).catch((err) => {
          // Non-blocking: log error but don't fail the request
          console.error('[BLOG-UPDATE] Failed to emit POST_GENERATION_COMPLETE event:', err);
        });
      } catch (error) {
        // Non-blocking: log error but don't fail the request
        console.error('[BLOG-UPDATE] Error emitting POST_GENERATION_COMPLETE event:', error);
      }
    }

    // FASE 2.2: Audit log - content_status_changed
    if (statusChanged) {
      const actorId = (session.user as any).id;
      try {
        await prisma.eventLog.create({
          data: {
            event: 'content_status_changed',
            url: `/admin/blog/posts/${params.id}`,
            meta: {
              postId: params.id,
              actorId,
              statusBefore,
              statusAfter,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        // Non-blocking: log error but don't fail the request
        console.error('Failed to log status change event:', error);
      }
    }

    return NextResponse.json({
      post: updated,
      message: 'Post updated successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog/posts/[id] - Delete blog post
/**
 * FITUR 5: Blog Post Delete Endpoint
 * 
 * DELETE /api/admin/blog/posts/[id]
 * 
 * Rules:
 * - ❌ Cannot delete if status is PUBLISHED
 * - ✅ Can delete DRAFT, REVIEW, ARCHIVED
 * - Admin & super_admin only
 */
export async function DELETE(
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
        title: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // ❌ Cannot delete if PUBLISHED
    if (post.status === 'PUBLISHED') {
      return NextResponse.json(
        {
          error: 'Cannot delete published post',
          message: 'Tidak dapat menghapus post yang sudah dipublish. Silakan unpublish terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    // Delete post
    await prisma.blogPost.delete({
      where: { id: params.id },
    });

    // Log activity
    const actorId = (session.user as any).id;
    try {
      await logActivity({
        actorId,
        action: 'DELETE',
        entityType: 'POST',
        entityId: params.id,
        metadata: {
          title: post.title,
          status: post.status,
        },
      });
    } catch (error) {
      // Non-blocking
      console.error('Failed to log delete activity:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}
