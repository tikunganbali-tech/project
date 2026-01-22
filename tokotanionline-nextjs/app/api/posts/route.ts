/**
 * STEP 6: Error handling hardened
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

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
});

// GET /api/posts - List all posts (admin only)
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = postSchema.parse(body);

    // Normalize slug for SEO hygiene
    const normalizedSlug = normalizeSlug(data.slug);
    
    if (!normalizedSlug) {
      return NextResponse.json({ error: 'Slug tidak valid setelah normalisasi' }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.post.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: normalizedSlug,
        content: data.content,
        published: data.published || false,
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    // STEP 6: Use logger, don't leak error details
    logger.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

