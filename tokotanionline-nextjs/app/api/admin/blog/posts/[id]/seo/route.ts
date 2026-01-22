/**
 * GET /api/admin/blog/posts/[id]/seo
 * 
 * Get SEO intelligence data for a blog post
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
        primaryKeyword: true,
        secondaryKeywords: true,
        keywordTree: true,
        intentType: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Extract keyword tree
    let primaryKeyword = post.primaryKeyword;
    let secondaryKeywords: string[] = Array.isArray(post.secondaryKeywords)
      ? post.secondaryKeywords
      : [];
    let longTailKeywords: string[] = [];

    if (post.keywordTree && typeof post.keywordTree === 'object') {
      const tree = post.keywordTree as any;
      primaryKeyword = primaryKeyword || tree.primary || null;
      if (Array.isArray(tree.secondary)) {
        secondaryKeywords = [...secondaryKeywords, ...tree.secondary];
      }
      if (Array.isArray(tree.longTail)) {
        longTailKeywords = tree.longTail;
      }
    }

    // Determine SEO status
    let status: 'VALID' | 'WARNING' | 'BLOCKED' = 'VALID';
    let statusReason: string | undefined;

    if (!primaryKeyword && secondaryKeywords.length === 0) {
      status = 'WARNING';
      statusReason = 'No keywords defined';
    } else if (!post.seoTitle || !post.seoDescription) {
      status = 'WARNING';
      statusReason = 'Missing meta title or description';
    }

    // Check for blocked keywords (if needed)
    // This is a placeholder - implement actual blocking logic if required
    const blockedKeywords: string[] = []; // Add blocked keywords here
    if (primaryKeyword && blockedKeywords.includes(primaryKeyword.toLowerCase())) {
      status = 'BLOCKED';
      statusReason = `Primary keyword "${primaryKeyword}" is blocked`;
    }

    return NextResponse.json({
      primaryKeyword,
      secondaryKeywords: Array.from(new Set(secondaryKeywords)), // Remove duplicates
      longTailKeywords,
      intentType: post.intentType,
      status,
      statusReason,
      metaTitle: post.seoTitle,
      metaDescription: post.seoDescription,
      seoKeywords: post.seoKeywords,
    });
  } catch (error: any) {
    console.error('Error fetching SEO data:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
