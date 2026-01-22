/**
 * GET /api/admin/blog/posts/[id]/metadata
 * 
 * Get blog metadata for AI Control Panel
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getCategoryWithParentChain } from '@/lib/unified-category-utils';

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
        unifiedCategoryId: true,
        relatedProductIds: true,
        keywordTree: true,
        intentType: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Get category info
    let category: { id: string; name: string; path: string } | null = null;
    if (post.unifiedCategoryId) {
      try {
        const categoryWithChain = await getCategoryWithParentChain(post.unifiedCategoryId);
        category = {
          id: categoryWithChain.id,
          name: categoryWithChain.name,
          path: [
            ...categoryWithChain.parentChain.map((p) => p.name),
            categoryWithChain.name,
          ].join(' > '),
        };
      } catch (err) {
        console.error('Error fetching category:', err);
      }
    }

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
      },
    }) : [];

    // Determine mode
    const mode = relatedProductIds.length > 0 ? 'PRODUCT_AWARE' : 'CATEGORY_ONLY';

    // Parse keyword tree
    let keywordTree: { primary: string; secondary: string[]; longTail: string[] } | null = null;
    if (post.keywordTree && typeof post.keywordTree === 'object') {
      const tree = post.keywordTree as any;
      keywordTree = {
        primary: tree.primary || '',
        secondary: Array.isArray(tree.secondary) ? (tree.secondary as unknown[]).filter((k): k is string => typeof k === 'string') : [],
        longTail: Array.isArray(tree.longTail) ? (tree.longTail as unknown[]).filter((k): k is string => typeof k === 'string') : [],
      };
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      mode,
      category,
      relatedProductIds,
      relatedProducts: products,
      intentType: post.intentType,
      keywordTree,
      isLocked: false, // TODO: Add lock field to schema if needed
    });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
