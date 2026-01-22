/**
 * Public Search API
 * 
 * Purpose: Search products and blog posts
 * - Server-side only
 * - No authentication required
 * - Search in products and blog posts
 * - Only PUBLISHED content
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import { PostStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // 'all' | 'products' | 'blog'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50); // Max 50 per page

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        products: [],
        blogPosts: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
        },
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    }

    const searchQuery = query.trim();
    const skip = (page - 1) * limit;

    // Search products
    let products: any[] = [];
    let productsTotal = 0;
    
    if (type === 'all' || type === 'products') {
      const productsWhere = {
        status: PRODUCT_STATUS.PUBLISHED,
        isActive: true,
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
          {
            shortDescription: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
        ],
      };

      productsTotal = await prisma.product.count({ where: productsWhere }).catch(() => 0);
      
      products = await prisma.product.findMany({
        where: productsWhere,
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          price: true,
          discountPrice: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }).catch(() => []);
    }

    // Search blog posts
    let blogPosts: any[] = [];
    let blogPostsTotal = 0;
    
    if (type === 'all' || type === 'blog') {
      const blogWhere = {
        status: PostStatus.PUBLISHED,
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
          {
            excerpt: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
          {
            content: {
              contains: searchQuery,
              mode: 'insensitive' as const,
            },
          },
        ],
      };

      blogPostsTotal = await prisma.blogPost.count({ where: blogWhere }).catch(() => 0);
      
      blogPosts = await prisma.blogPost.findMany({
        where: blogWhere,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take: limit,
      }).catch(() => []);
    }

    // Calculate total for pagination
    const total = productsTotal + blogPostsTotal;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json({
      query: searchQuery,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        price: p.price,
        discountPrice: p.discountPrice,
        category: p.category,
      })),
      blogPosts: blogPosts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        productsTotal,
        blogPostsTotal,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      {
        query: '',
        products: [],
        blogPosts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          productsTotal: 0,
          blogPostsTotal: 0,
        },
      },
      { status: 200 } // Return empty result instead of 500
    );
  }
}
