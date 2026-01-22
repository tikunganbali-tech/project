/**
 * UI-C2 — SEO MONITOR API
 * 
 * Endpoint: GET /api/admin/seo/monitor
 * 
 * Fungsi: List semua konten (Blog & Product) dengan status SEO
 * Status: READ-ONLY (tidak mengubah data)
 * 
 * Status Rules (DIKUNCI):
 * - READY: Primary keyword ada, Title ada, Content ada
 * - WARNING: Secondary keyword kosong (opsional), Image < ideal
 * - RISK: Primary keyword kosong OR Title kosong OR Content kosong
 * 
 * 📌 Tidak ada keyword density
 * 📌 Tidak ada skor aneh
 * 📌 SEO modern & aman
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface SeoMonitorItem {
  id: string;
  type: 'blog' | 'product';
  title: string;
  slug: string;
  primaryKeyword: string | null;
  secondaryKeywords: string[] | null;
  status: 'READY' | 'WARNING' | 'RISK';
  issues: string[];
  hasImage: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type SeoStatus = 'READY' | 'WARNING' | 'RISK';

/**
 * Calculate SEO status for a content item
 */
function calculateSeoStatus(
  primaryKeyword: string | null,
  title: string | null,
  content: string | null,
  secondaryKeywords: string[] | null,
  hasImage: boolean
): { status: SeoStatus; issues: string[] } {
  const issues: string[] = [];
  
  // RISK checks (critical)
  if (!primaryKeyword || primaryKeyword.trim() === '') {
    issues.push('Primary keyword kosong');
  }
  if (!title || title.trim() === '') {
    issues.push('Title kosong');
  }
  if (!content || content.trim() === '') {
    issues.push('Content kosong');
  }
  
  // If any RISK issue, return RISK
  if (issues.length > 0) {
    return { status: 'RISK', issues };
  }
  
  // WARNING checks (non-critical)
  if (!secondaryKeywords || secondaryKeywords.length === 0) {
    issues.push('Secondary keyword kosong (opsional)');
  }
  if (!hasImage) {
    issues.push('Image < ideal');
  }
  
  // If WARNING issues but no RISK, return WARNING
  if (issues.length > 0) {
    return { status: 'WARNING', issues };
  }
  
  // All good
  return { status: 'READY', issues: [] };
}

export async function GET(req: NextRequest) {
  try {
    // Authentication & permission check
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get filter params
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // all, ready, warning, risk
    const typeFilter = searchParams.get('type'); // blog, product
    const search = searchParams.get('search') || '';

    const items: SeoMonitorItem[] = [];

    // Fetch Blogs
    if (!typeFilter || typeFilter === 'blog') {
      const blogs = await prisma.blog.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          metaTitle: true,
          metaKeywords: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const blog of blogs) {
        // Extract primary keyword from metaKeywords or use null
        let primaryKeyword: string | null = null;
        let secondaryKeywords: string[] | null = null;
        
        if (blog.metaKeywords) {
          // Try to parse as JSON array first
          try {
            const parsed = JSON.parse(blog.metaKeywords);
            if (Array.isArray(parsed) && parsed.length > 0) {
              primaryKeyword = parsed[0];
              secondaryKeywords = parsed.slice(1);
            }
          } catch {
            // If not JSON, treat as comma-separated string
            const keywords = blog.metaKeywords.split(',').map(k => k.trim()).filter(k => k);
            if (keywords.length > 0) {
              primaryKeyword = keywords[0];
              secondaryKeywords = keywords.slice(1);
            }
          }
        }

        const title = blog.metaTitle || blog.title;
        const content = blog.content;
        const hasImage = !!blog.imageUrl;

        const { status, issues } = calculateSeoStatus(
          primaryKeyword,
          title,
          content,
          secondaryKeywords,
          hasImage
        );

        // Apply filters
        if (filter !== 'all' && filter.toUpperCase() !== status) continue;
        if (search && !blog.title.toLowerCase().includes(search.toLowerCase()) &&
            !title.toLowerCase().includes(search.toLowerCase()) &&
            !(primaryKeyword && primaryKeyword.toLowerCase().includes(search.toLowerCase()))) {
          continue;
        }

        items.push({
          id: blog.id,
          type: 'blog',
          title: blog.title,
          slug: blog.slug,
          primaryKeyword,
          secondaryKeywords,
          status,
          issues,
          hasImage,
          createdAt: blog.createdAt,
          updatedAt: blog.updatedAt,
        });
      }
    }

    // Fetch BlogPosts (if using BlogPost model)
    if (!typeFilter || typeFilter === 'blog') {
      const blogPosts = await prisma.blogPost.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          seoTitle: true,
          primaryKeyword: true,
          secondaryKeywords: true,
          featuredImageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const blogPost of blogPosts) {
        const title = blogPost.seoTitle || blogPost.title;
        const content = blogPost.content;
        const hasImage = !!blogPost.featuredImageUrl;

        const { status, issues } = calculateSeoStatus(
          blogPost.primaryKeyword,
          title,
          content,
          blogPost.secondaryKeywords,
          hasImage
        );

        // Apply filters
        if (filter !== 'all' && filter.toUpperCase() !== status) continue;
        if (search && !blogPost.title.toLowerCase().includes(search.toLowerCase()) &&
            !title.toLowerCase().includes(search.toLowerCase()) &&
            !(blogPost.primaryKeyword && blogPost.primaryKeyword.toLowerCase().includes(search.toLowerCase()))) {
          continue;
        }

        items.push({
          id: blogPost.id,
          type: 'blog',
          title: blogPost.title,
          slug: blogPost.slug,
          primaryKeyword: blogPost.primaryKeyword,
          secondaryKeywords: blogPost.secondaryKeywords,
          status,
          issues,
          hasImage,
          createdAt: blogPost.createdAt,
          updatedAt: blogPost.updatedAt,
        });
      }
    }

    // Fetch Products
    if (!typeFilter || typeFilter === 'product') {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          metaTitle: true,
          metaKeywords: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const product of products) {
        // Extract primary keyword from metaKeywords or use null
        let primaryKeyword: string | null = null;
        let secondaryKeywords: string[] | null = null;
        
        if (product.metaKeywords) {
          // Try to parse as JSON array first
          try {
            const parsed = JSON.parse(product.metaKeywords);
            if (Array.isArray(parsed) && parsed.length > 0) {
              primaryKeyword = parsed[0];
              secondaryKeywords = parsed.slice(1);
            }
          } catch {
            // If not JSON, treat as comma-separated string
            const keywords = product.metaKeywords.split(',').map(k => k.trim()).filter(k => k);
            if (keywords.length > 0) {
              primaryKeyword = keywords[0];
              secondaryKeywords = keywords.slice(1);
            }
          }
        }

        const title = product.metaTitle || product.name;
        const content = product.description;
        const hasImage = !!product.imageUrl;

        const { status, issues } = calculateSeoStatus(
          primaryKeyword,
          title,
          content,
          secondaryKeywords,
          hasImage
        );

        // Apply filters
        if (filter !== 'all' && filter.toUpperCase() !== status) continue;
        if (search && !product.name.toLowerCase().includes(search.toLowerCase()) &&
            !title.toLowerCase().includes(search.toLowerCase()) &&
            !(primaryKeyword && primaryKeyword.toLowerCase().includes(search.toLowerCase()))) {
          continue;
        }

        items.push({
          id: product.id,
          type: 'product',
          title: product.name,
          slug: product.slug,
          primaryKeyword,
          secondaryKeywords,
          status,
          issues,
          hasImage,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        });
      }
    }

    // Sort by updated date (newest first)
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Calculate stats
    const total = items.length;
    const ready = items.filter(i => i.status === 'READY').length;
    const warning = items.filter(i => i.status === 'WARNING').length;
    const risk = items.filter(i => i.status === 'RISK').length;

    return NextResponse.json({
      success: true,
      items,
      stats: {
        total,
        ready,
        warning,
        risk,
        readyPercent: total > 0 ? Math.round((ready / total) * 100) : 0,
        warningPercent: total > 0 ? Math.round((warning / total) * 100) : 0,
        riskPercent: total > 0 ? Math.round((risk / total) * 100) : 0,
      },
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/seo/monitor] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
