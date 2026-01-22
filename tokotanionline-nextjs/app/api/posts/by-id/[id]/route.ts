/**
 * STEP 6: Error handling hardened
 * STEP 9A: Moved to by-id structure to resolve routing conflict
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import * as logger from '@/lib/logger';

/**
 * Normalize slug for SEO hygiene:
 * - lowercase
 * - spaces to hyphens
 * - remove invalid characters
 */
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/[^a-z0-9\-]/g, '') // remove invalid chars (keep only alphanumeric and hyphens)
    .replace(/-+/g, '-') // multiple hyphens to single
    .replace(/^-|-$/g, ''); // remove leading/trailing hyphens
}

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

// PUT /api/posts/by-id/[id] - Update post (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    // Check if post exists
    const existing = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If slug is being updated, normalize and check availability
    let normalizedSlug = existing.slug;
    if (data.slug) {
      normalizedSlug = normalizeSlug(data.slug);
      
      if (!normalizedSlug) {
        return NextResponse.json({ error: 'Slug tidak valid setelah normalisasi' }, { status: 400 });
      }

      // Check if new slug is different and available
      if (normalizedSlug !== existing.slug) {
        const slugExists = await prisma.post.findUnique({
          where: { slug: normalizedSlug },
        });

        if (slugExists) {
          return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
        }
      }
    }

    const post = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: normalizedSlug }),
        ...(data.content && { content: data.content }),
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    // STEP 6: Use logger, don't leak error details
    logger.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}


