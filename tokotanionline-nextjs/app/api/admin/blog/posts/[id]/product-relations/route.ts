/**
 * GET /api/admin/blog/posts/[id]/product-relations
 * 
 * Get product-blog relations for a specific blog
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export async function GET(
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
        slug: true,
        unifiedCategoryId: true,
        relatedProductIds: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Get category name
    let categoryName: string | null = null;
    if (post.unifiedCategoryId) {
      const category = await prisma.category.findUnique({
        where: { id: post.unifiedCategoryId },
        select: { name: true },
      });
      categoryName = category?.name || null;
    }

    // Count available products in category
    const availableProductsCount = post.unifiedCategoryId
      ? await prisma.product.count({
          where: {
            unifiedCategoryId: post.unifiedCategoryId,
            isActive: true,
          },
        })
      : 0;

    // Get related products
    const relatedProductIdsRaw = post.relatedProductIds;
    const relatedProductIds: string[] = Array.isArray(relatedProductIdsRaw)
      ? (relatedProductIdsRaw as unknown[]).filter((id): id is string => typeof id === 'string')
      : relatedProductIdsRaw && typeof relatedProductIdsRaw === 'string'
      ? [relatedProductIdsRaw]
      : [];
    const products = relatedProductIds.length > 0 ? await prisma.product.findMany({
      where: {
        id: { in: relatedProductIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    }) : [];

    // Build relations
    const relations = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.isActive ? ('VALID' as const) : ('WARNING' as const),
      reason: product.isActive ? undefined : 'Product is inactive',
    }));

    // Determine blog status
    let status: 'VALID' | 'WARNING' = 'VALID';
    let warningReason: string | undefined;

    if (availableProductsCount > 0 && relatedProductIds.length === 0) {
      status = 'WARNING';
      warningReason = `Category has ${availableProductsCount} products but article has no related products`;
    } else if (relatedProductIds.length > 0 && products.length === 0) {
      status = 'WARNING';
      warningReason = 'Related product IDs specified but products not found';
    }

    return NextResponse.json({
      blogs: [
        {
          id: post.id,
          title: post.title,
          slug: post.slug,
          relatedProductIds,
          categoryId: post.unifiedCategoryId,
          categoryName,
          availableProductsCount,
          relations,
          status,
          warningReason,
        },
      ],
    });
  } catch (error: any) {
    console.error('Error fetching product relations:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
