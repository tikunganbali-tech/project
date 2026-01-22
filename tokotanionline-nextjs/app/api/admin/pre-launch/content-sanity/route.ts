/**
 * PHASE H — Content Sanity Check Endpoint
 * 
 * GET /api/admin/pre-launch/content-sanity
 * 
 * Purpose: Validasi konten contoh sebelum launch
 * - 5-10 produk contoh: slug valid, deskripsi tidak kosong, image valid
 * - 3-5 blog post: publishAt valid, SEO keyword terisi, image tampil normal
 * 
 * Prinsip:
 * - Read-only (tidak mengubah data)
 * - Deterministic (hasil sama setiap kali)
 * - Fail-fast (return error jika ada masalah)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ContentSanityResult {
  status: 'ok' | 'warning' | 'error';
  timestamp: string;
  products: {
    total: number;
    valid: number;
    invalid: number;
    issues: Array<{
      id: string;
      name: string;
      slug: string;
      issues: string[];
    }>;
  };
  blogPosts: {
    total: number;
    valid: number;
    invalid: number;
    issues: Array<{
      id: string;
      title: string;
      slug: string;
      issues: string[];
    }>;
  };
}

/**
 * PHASE H: Validate product
 */
function validateProduct(product: any): string[] {
  const issues: string[] = [];

  // Check slug valid & konsisten
  if (!product.slug || typeof product.slug !== 'string' || product.slug.trim() === '') {
    issues.push('Slug tidak valid atau kosong');
  } else if (!/^[a-z0-9-]+$/.test(product.slug)) {
    issues.push('Slug mengandung karakter tidak valid (hanya lowercase, angka, dan dash)');
  }

  // Check deskripsi tidak kosong
  if (!product.description || product.description.trim() === '') {
    issues.push('Deskripsi kosong');
  }

  // Check image valid
  if (!product.imageUrl || product.imageUrl.trim() === '') {
    issues.push('Image URL kosong');
  } else {
    // Check if image file exists (if local path)
    if (product.imageUrl.startsWith('/')) {
      const imagePath = path.join(process.cwd(), 'public', product.imageUrl);
      if (!fs.existsSync(imagePath)) {
        issues.push(`Image file tidak ditemukan: ${product.imageUrl}`);
      }
    }
  }

  // Check status is PUBLISHED
  if (product.status !== PRODUCT_STATUS.PUBLISHED) {
    issues.push(`Status bukan PUBLISHED (current: ${product.status})`);
  }

  // Check isActive
  if (!product.isActive) {
    issues.push('Product tidak aktif (isActive: false)');
  }

  return issues;
}

/**
 * PHASE H: Validate blog post
 */
function validateBlogPost(post: any): string[] {
  const issues: string[] = [];

  // Check publishAt valid
  if (!post.publishedAt) {
    issues.push('publishedAt tidak ada');
  } else {
    const publishDate = new Date(post.publishedAt);
    if (isNaN(publishDate.getTime())) {
      issues.push('publishedAt tidak valid');
    } else if (publishDate > new Date()) {
      issues.push('publishedAt di masa depan (belum publish)');
    }
  }

  // Check SEO keyword terisi (minimal seoTitle atau seoDescription)
  if (!post.seoTitle && !post.seoDescription) {
    issues.push('SEO keyword tidak terisi (seoTitle dan seoDescription kosong)');
  }

  // Check slug valid
  if (!post.slug || typeof post.slug !== 'string' || post.slug.trim() === '') {
    issues.push('Slug tidak valid atau kosong');
  } else if (!/^[a-z0-9-]+$/.test(post.slug)) {
    issues.push('Slug mengandung karakter tidak valid');
  }

  // Check status is PUBLISHED
  if (post.status !== 'PUBLISHED') {
    issues.push(`Status bukan PUBLISHED (current: ${post.status})`);
  }

  // Check title tidak kosong
  if (!post.title || post.title.trim() === '') {
    issues.push('Title kosong');
  }

  return issues;
}

export async function GET() {
  try {
    // PHASE H: Auth check (admin only)
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // PHASE H: Get published products (limit 10 untuk contoh)
    const products = await prisma.product.findMany({
      where: {
        status: PRODUCT_STATUS.PUBLISHED,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        status: true,
        isActive: true,
      },
      take: 10,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // PHASE H: Get published blog posts (limit 5 untuk contoh)
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
      },
      take: 5,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    // PHASE H: Validate products
    const productIssues: Array<{ id: string; name: string; slug: string; issues: string[] }> = [];
    let validProducts = 0;

    for (const product of products) {
      const issues = validateProduct(product);
      if (issues.length > 0) {
        productIssues.push({
          id: product.id,
          name: product.name || 'Unknown',
          slug: product.slug || 'unknown',
          issues,
        });
      } else {
        validProducts++;
      }
    }

    // PHASE H: Validate blog posts
    const blogIssues: Array<{ id: string; title: string; slug: string; issues: string[] }> = [];
    let validBlogPosts = 0;

    for (const post of blogPosts) {
      const issues = validateBlogPost(post);
      if (issues.length > 0) {
        blogIssues.push({
          id: post.id,
          title: post.title || 'Unknown',
          slug: post.slug || 'unknown',
          issues,
        });
      } else {
        validBlogPosts++;
      }
    }

    // PHASE H: Determine overall status
    const hasErrors = productIssues.length > 0 || blogIssues.length > 0;
    const hasWarnings = products.length < 5 || blogPosts.length < 3;
    
    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (hasErrors) {
      status = 'error';
    } else if (hasWarnings) {
      status = 'warning';
    }

    const result: ContentSanityResult = {
      status,
      timestamp: new Date().toISOString(),
      products: {
        total: products.length,
        valid: validProducts,
        invalid: productIssues.length,
        issues: productIssues,
      },
      blogPosts: {
        total: blogPosts.length,
        valid: validBlogPosts,
        invalid: blogIssues.length,
        issues: blogIssues,
      },
    };

    const statusCode = status === 'error' ? 400 : status === 'warning' ? 200 : 200;

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[content-sanity] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Failed to check content sanity',
      },
      { status: 500 }
    );
  }
}
