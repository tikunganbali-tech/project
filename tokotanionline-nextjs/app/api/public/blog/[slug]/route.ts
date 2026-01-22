/**
 * STEP P2A-1: Public Blog Detail API (READ-ONLY)
 * GET /api/public/blog/[slug]
 * 
 * Purpose: Public read-only API untuk blog post detail
 * - Hanya status = PUBLISHED
 * - 404 jika slug tidak ada atau status ≠ PUBLISHED
 * - Response include: title, content, publishedAt, seo
 * - Tidak include: status, engine metadata, job/result data
 * - SEO-friendly untuk crawlers
 * 
 * Response:
 * {
 *   title, content, publishedAt,
 *   seo { title, description, schemaJson }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PostStatus } from '@prisma/client';
import { BlogDetailSchema, validateApiResponse } from '@/lib/api-response-schemas';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // PHASE B2-L: Fetch blog post with related products
    // slug is not unique alone, use findFirst with status filter
    const post = await prisma.blogPost.findFirst({
      where: { 
        slug: params.slug,
        status: 'PUBLISHED', // Only published posts for public API
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentMode: true, // M-07
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        seoSchema: true, // This is the schemaJson field
        publishedAt: true,
        status: true, // Need to check status, but won't include in response
        // PHASE B2-L: Fetch related products via BlogProduct relation
        // Note: BlogPost doesn't have direct relation, need to check if there's a way to link
        // For now, we'll fetch products separately if needed
      },
    }).catch(() => null);

    // 404 if post doesn't exist
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 404 if status is not PUBLISHED
    if (post.status !== PostStatus.PUBLISHED) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // PHASE B2-L: Extract FAQ from seoSchema
    let faq: Array<{ q: string; a: string }> = [];
    if (post.seoSchema && typeof post.seoSchema === 'object') {
      try {
        const schema = post.seoSchema as any;
        // Check if FAQ schema exists
        if (schema['@type'] === 'FAQPage' && Array.isArray(schema.mainEntity)) {
          faq = schema.mainEntity.map((item: any) => ({
            q: item.name || '',
            a: item.acceptedAnswer?.text || '',
          })).filter((item: { q: string; a: string }) => item.q && item.a);
        }
      } catch (error) {
        // Ignore parsing errors
        console.error('Error parsing FAQ from seoSchema:', error);
      }
    }

    // PHASE B2-L: Fetch related products
    // Since BlogPost doesn't have direct relation, we'll check seoSchema for related_product_ids
    // or fetch from a metadata field if available
    let relatedProducts: Array<{
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      priceResolved: number;
    }> = [];

    try {
      // Try to extract related_product_ids from seoSchema metadata
      if (post.seoSchema && typeof post.seoSchema === 'object') {
        const schema = post.seoSchema as any;
        const relatedProductIds = schema.related_product_ids || schema.relatedProducts || [];
        
        if (Array.isArray(relatedProductIds) && relatedProductIds.length > 0) {
          // Fetch products by IDs (only PUBLISHED)
          const PRODUCT_STATUS = {
            PUBLISHED: 'PUBLISHED',
          };

          const products = await prisma.product.findMany({
            where: {
              id: { in: relatedProductIds },
              status: PRODUCT_STATUS.PUBLISHED,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              price: true,
              discountPrice: true,
            },
            take: 4, // Max 4 products
          });

          relatedProducts = products.map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: product.imageUrl,
            priceResolved: product.discountPrice || product.price,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      // Continue without related products if fetch fails
    }

    // Build public response (exclude status and engine metadata) - defensive
    const response = {
      title: post.title || '',
      content: post.content || '',
      contentMode: post.contentMode || 'HTML', // M-07: Default to HTML for backward compatibility
      excerpt: post.excerpt || null,
      publishedAt: post.publishedAt,
      seo: {
        title: post.seoTitle || post.title || '',
        description: post.seoDescription || post.excerpt || null,
        schemaJson: post.seoSchema || null,
      },
      // PHASE B2-L: Include FAQ and related products
      faq: faq.length > 0 ? faq : undefined,
      relatedProducts: relatedProducts.length > 0 ? relatedProducts : undefined,
    };

    // PHASE B: Validate response schema before returning
    try {
      const validatedResponse = validateApiResponse(
        response,
        BlogDetailSchema,
        `GET /api/public/blog/${params.slug}`
      );

      // Return with cache headers
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      console.error('[API-VALIDATION] Blog detail response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching public blog post:', error);
    // Return 404 for not found, not 500
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }
}
