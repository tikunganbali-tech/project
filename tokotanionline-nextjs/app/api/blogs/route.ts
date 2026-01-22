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
  unifiedCategoryId: z.string().optional().nullable(), // PRODUCT-AWARE: Unified category
  imageUrl: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  scheduledAt: z.string().optional().nullable(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  relatedProductIds: z.array(z.string()).optional(), // PRODUCT-AWARE: Related products
  keywordTree: z.object({
    primary: z.string(),
    secondary: z.array(z.string()),
    longTail: z.array(z.string()),
  }).optional(), // PRODUCT-AWARE: Keyword tree
  intentType: z.string().optional(), // PRODUCT-AWARE: Intent type
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

async function resolveLocaleIdFromRequest(request: NextRequest, brandId: string): Promise<string> {
  const headerLocaleId = request.headers.get('x-locale-id');
  if (headerLocaleId) return headerLocaleId;

  const defaultLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (defaultLocale) return defaultLocale.id;

  const firstActiveLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveLocale) {
    throw new Error('No ACTIVE locale found for brand. Please create a locale first.');
  }
  return firstActiveLocale.id;
}

// GET /api/blogs
export async function GET() {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ blogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/blogs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = blogSchema.parse(body);

    const brandId = await resolveBrandIdFromRequest(request, session);
    const localeId = await resolveLocaleIdFromRequest(request, brandId);

    // Auto-generate SEO
    const metaTitle = data.metaTitle || data.title;
    const metaDescription = data.metaDescription || data.excerpt.substring(0, 160);

    // Check slug
    const existing = await prisma.blog.findFirst({
      where: { slug: data.slug, brandId, localeId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    const publishedAt =
      data.status === 'published' ? new Date() : data.status === 'scheduled' && data.scheduledAt
        ? new Date(data.scheduledAt)
        : null;

    // Get author - use pseudonym if not provided or if it's "Admin" or "AI Generator"
    // DISABLED: Author pseudonyms module not available
    let finalAuthor = data.author;
    if (!finalAuthor || finalAuthor === 'Admin' || finalAuthor.includes('AI') || finalAuthor.includes('Generator')) {
      // const { getAuthorByCategory, getRandomAuthor } = await import('@/lib/author-pseudonyms');
      // const category = data.categoryId
      //   ? await prisma.blogCategory.findUnique({ where: { id: data.categoryId } })
      //   : null;
      // finalAuthor = category ? getAuthorByCategory(category.name) : getRandomAuthor();
      finalAuthor = finalAuthor || 'Admin'; // Fallback to provided author or 'Admin'
    }

    // M-02: Normalize image path before saving
    const normalizedImageUrl = data.imageUrl ? normalizeImagePathSafe(data.imageUrl) : null;

    // PRODUCT-AWARE: Validate product requirement if category has products
    if (data.unifiedCategoryId) {
      const { validateBlogProductRequirement } = await import('@/lib/product-aware-blog-ai');
      const validation = await validateBlogProductRequirement(
        data.unifiedCategoryId,
        data.relatedProductIds
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Product requirement validation failed', message: validation.error },
          { status: 400 }
        );
      }
    }

    const blog = await prisma.blog.create({
      data: {
        title: data.title,
        slug: data.slug,
        brandId,
        localeId,
        excerpt: data.excerpt,
        content: data.content,
        author: finalAuthor,
        categoryId: data.categoryId || null,
        unifiedCategoryId: data.unifiedCategoryId || null,
        imageUrl: normalizedImageUrl,
        status: data.status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        publishedAt,
        metaTitle,
        metaDescription,
        // PRODUCT-AWARE: Save metadata
        relatedProductIds: data.relatedProductIds ? JSON.parse(JSON.stringify(data.relatedProductIds)) : null,
        keywordTree: data.keywordTree ? JSON.parse(JSON.stringify(data.keywordTree)) : null,
        intentType: data.intentType || null,
      },
    });

    await prisma.seoMetadata.upsert({
      where: {
        entityType_entityId_brandId: {
          entityType: 'blog',
          entityId: blog.id,
          brandId,
        },
      },
      update: {
        metaTitle,
        metaDescription,
        canonicalUrl: `/blog/${blog.slug}`,
        localeId,
      },
      create: {
        entityType: 'blog',
        entityId: blog.id,
        brandId,
        localeId,
        metaTitle,
        metaDescription,
        canonicalUrl: `/blog/${blog.slug}`,
      },
    });

    // Link products
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

    // Auto-inject products, CTAs, and internal links if published (non-blocking)
    // DISABLED: Engine module not available
    // if (blog.status === 'published') {
    //   setImmediate(async () => {
    //     try {
    //       const { autoInjectBlogContent } = await import('@/lib/blog-auto-injection/blog-auto-injection-engine');
    //       await autoInjectBlogContent({
    //         blogId: blog.id,
    //         allowCMSOverride: true, // Respect CMS manual product links
    //       });
    //     } catch (error) {
    //       console.warn('Error auto-injecting blog content:', error);
    //     }
    //   });
    // }

    // QUALITY ASSURANCE: Validate before publishing
    // DISABLED: Engine modules not available
    if (blog.status === 'published') {
      // const { validateAndBlockPublishing } = await import('@/lib/quality/content-quality-assurance');
      // const validation = await validateAndBlockPublishing(blog.id);

      // if (!validation.canPublish) {
      //   // Revert to draft if validation fails
      //   const updatedBlog = await prisma.blog.update({
      //     where: { id: blog.id },
      //     data: { status: 'draft' },
      //   });

      //   return NextResponse.json({
      //     blog: updatedBlog,
      //     validation: validation.result,
      //     message: 'Content validation failed. Blog saved as draft.',
      //     errors: validation.result.errors,
      //     warnings: validation.result.warnings,
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
      //   .then(({ processNewBlog }) => processNewBlog(blog.id))
      //   .catch((e) => console.error('SEO Titan error:', e));
      
      // Existing engines
      // import('@/lib/engines/integration')
      //   .then(({ runEnginesForBlog }) => runEnginesForBlog(blog.id, { skipDistribution: false }))
      //   .catch((e) => console.error('Engine execution error:', e));
    }

    return NextResponse.json({ blog });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
