/**
 * PHASE 3.2: Admin Blog Posts API
 * 
 * GET /api/admin/blog/posts - List blog posts (with filters)
 * POST /api/admin/blog/posts - Create new blog post (DRAFT only)
 * 
 * Rules:
 * - Admin & super_admin only
 * - Defensive: return [] if table empty, not error
 * - Filter by status, search by title
 * - Sort by createdAt desc (default)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { ensureSEO } from '@/lib/seo-utils';
import { sanitizeHTML, inferContentMode } from '@/lib/html-sanitizer';
import { z } from 'zod';

const blogPostCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  contentMode: z.enum(['TEXT', 'HTML']).optional(), // M-07
  excerpt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  scheduledAt: z.string().optional().nullable(), // FASE 2.2: Scheduling
  // LAST LOCK: Required fields (optional for backward compatibility during migration)
  unifiedCategoryId: z.string().optional().nullable(),
  intentType: z.string().optional().nullable(),
  articleStatus: z.enum(['DRAFT', 'GENERATED', 'VALIDATED']).optional(),
});

async function resolveBrandIdFromRequest(request: NextRequest, session: any): Promise<string> {
  const headerBrandId = request.headers.get('x-brand-id');
  if (headerBrandId) return headerBrandId;

  if (session?.user?.email) {
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
      select: { brandId: true, role: true },
    });
    if (admin?.brandId) return admin.brandId;
  }

  const firstActiveBrand = await prisma.brand.findFirst({
    where: { brandStatus: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveBrand) {
    throw new Error('No ACTIVE brand found. Please create a brand first.');
  }
  return firstActiveBrand.id;
}

// GET /api/admin/blog/posts - List blog posts
export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED' | null;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'publishedAt') {
      orderBy.publishedAt = sortOrder;
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Defensive: catch if table doesn't exist, return empty array
    let posts: any[] = [];
    let total = 0;

    try {
      // Fetch posts with pagination
      const [postsData, totalCount] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            status: true,
            publishedAt: true,
            scheduledAt: true, // PHASE S
            approvedAt: true, // PHASE S
            approvedBy: true, // PHASE S
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            approver: { // PHASE S
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.blogPost.count({ where }),
      ]);

      posts = postsData;
      total = totalCount;
    } catch (error: any) {
      // Defensive: if table doesn't exist or any DB error, return empty
      console.error('Error fetching blog posts:', error);
      // Return empty array, not error
      return NextResponse.json({
        posts: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/blog/posts:', error);
    // Defensive: return empty array on any error
    return NextResponse.json({
      posts: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  }
}

// POST /api/admin/blog/posts - Create new blog post (DRAFT only)
export async function POST(request: NextRequest) {
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

    const authorId = (session.user as any).id;

    const body = await request.json();
    const data = blogPostCreateSchema.parse(body);

    // Resolve brandId (required for BlogPost)
    const brandId = await resolveBrandIdFromRequest(request, session);

    // Check slug uniqueness (using findFirst since slug is not unique alone, need brandId)
    const existingSlug = await prisma.blogPost.findFirst({
      where: { 
        slug: data.slug,
        brandId: brandId,
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // M-06: Ensure SEO is always filled (auto-generate if empty)
    const seoResult = ensureSEO({
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      primaryKeyword: data.primaryKeyword,
      seoManual: !!(data.seoTitle && data.seoDescription), // Manual if both provided
    });

    // M-07: Determine contentMode (use provided or infer from content)
    const contentMode = data.contentMode || inferContentMode(data.content);
    
    // M-07: Sanitize HTML if mode is HTML
    const finalContent = contentMode === 'HTML' ? sanitizeHTML(data.content) : data.content;

    // Create post as DRAFT (always)
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: finalContent,
        contentMode: contentMode, // M-07
        excerpt: data.excerpt || null,
        status: 'DRAFT', // Always DRAFT on create
        authorId: authorId,
        brandId: brandId, // Required field
        seoTitle: seoResult.seoTitle || null,
        seoDescription: seoResult.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        primaryKeyword: data.primaryKeyword || null,
        secondaryKeywords: data.secondaryKeywords || [],
        publishedAt: null, // Only set when PUBLISHED
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null, // FASE 2.2: Scheduling
        // LAST LOCK: Category and Intent
        unifiedCategoryId: data.unifiedCategoryId || null,
        intentType: data.intentType || null,
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

    return NextResponse.json({
      post,
      message: 'Blog post created as DRAFT',
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
