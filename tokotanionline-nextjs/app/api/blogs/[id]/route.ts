import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeImagePathSafe } from '@/lib/normalizeImagePath';

const blogSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  author: z.string(),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  scheduledAt: z.string().optional().nullable(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  relatedProductIds: z.array(z.string()).optional(),
});

// GET /api/blogs/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blog = await prisma.blog.findUnique({
      where: { id: params.id },
      include: {
        blogProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    return NextResponse.json({ blog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/blogs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = blogSchema.parse(body);

    const metaTitle = data.metaTitle || data.title;
    const metaDescription = data.metaDescription || data.excerpt.substring(0, 160);

    // Check slug
    const existing = await prisma.blog.findFirst({
      where: {
        slug: data.slug,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    const currentBlog = await prisma.blog.findUnique({
      where: { id: params.id },
    });

    const publishedAt =
      data.status === 'published' && !currentBlog?.publishedAt
        ? new Date()
        : currentBlog?.publishedAt || null;

    // M-02: Normalize image path before saving
    const normalizedImageUrl = data.imageUrl ? normalizeImagePathSafe(data.imageUrl) : null;

    const blog = await prisma.blog.update({
      where: { id: params.id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        categoryId: data.categoryId || null,
        imageUrl: normalizedImageUrl,
        status: data.status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        publishedAt,
        metaTitle,
        metaDescription,
      },
    });

    await prisma.seoMetadata.upsert({
      where: {
        entityType_entityId_brandId: {
          entityType: 'blog',
          entityId: blog.id,
          brandId: blog.brandId,
        },
      },
      update: {
        metaTitle,
        metaDescription,
        canonicalUrl: `/blog/${blog.slug}`,
        localeId: blog.localeId,
      },
      create: {
        entityType: 'blog',
        entityId: blog.id,
        brandId: blog.brandId,
        localeId: blog.localeId,
        metaTitle,
        metaDescription,
        canonicalUrl: `/blog/${blog.slug}`,
      },
    });

    // Update product links
    await prisma.blogProduct.deleteMany({
      where: { blogId: blog.id },
    });

    if (data.relatedProductIds && data.relatedProductIds.length > 0) {
      await Promise.all(
        data.relatedProductIds.map((productId) =>
          prisma.blogProduct.create({
            data: {
              blogId: blog.id,
              productId,
            },
          })
        )
      );
    }

    // Trigger all engines if status changed to published
    // DISABLED: Engine modules not available
    if (data.status === 'published' && (!currentBlog || currentBlog.status !== 'published')) {
      // QUALITY ASSURANCE: Validate before publishing
      // const { validateAndBlockPublishing } = await import('@/lib/quality/content-quality-assurance');
      // const validation = await validateAndBlockPublishing(params.id);

      // if (!validation.canPublish) {
      //   // Revert status change
      //   await prisma.blog.update({
      //     where: { id: params.id },
      //     data: { status: currentBlog?.status || 'draft' },
      //   });

      //   return NextResponse.json({
      //     error: 'Content validation failed',
      //     validation: validation.result,
      //     errors: validation.result.errors,
      //     warnings: validation.result.warnings,
      //     message: 'Content does not meet quality standards. Blog status reverted.',
      //   }, { status: 400 });
      // }

      // Create auto jobs for engines
      // import('@/lib/seo-titan/auto-worker')
      //   .then(({ createEngineJob }) => createEngineJob('blog_published', {
      //     entityId: blog.id,
      //     entityType: 'blog',
      //     content: blog.content,
      //     excerpt: blog.excerpt,
      //     primaryKeyword: blog.metaKeywords ? JSON.parse(blog.metaKeywords)?.[0] : null,
      //   }))
      //   .catch((e) => console.error('Auto worker error:', e));
      
      // SEO Titan engines (backward compatibility)
      // import('@/lib/seo-titan/integration')
      //   .then(({ processUpdatedBlog }) => processUpdatedBlog(blog.id))
      //   .catch((e) => console.error('SEO Titan error:', e));
      
      // Existing engines
      // import('@/lib/engines/integration')
      //   .then(({ runEnginesForBlog }) => runEnginesForBlog(blog.id, { skipDistribution: false }))
      //   .catch((e) => console.error('Engine execution error:', e));
    } else if (data.status && currentBlog && currentBlog.status !== data.status) {
      // Blog updated (not status change)
      // import('@/lib/seo-titan/auto-worker')
      //   .then(({ createEngineJob }) => createEngineJob('blog_updated', {
      //     entityId: blog.id,
      //     entityType: 'blog',
      //     content: blog.content,
      //     excerpt: blog.excerpt,
      //   }))
      //   .catch((e) => console.error('Auto worker error:', e));
    }

    return NextResponse.json({ blog });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/blogs/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.blog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

