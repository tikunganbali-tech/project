/**
 * STEP P2A-1: Public Product Detail API (READ-ONLY)
 * GET /api/public/products/[slug]
 * 
 * Purpose: Public read-only API untuk product detail
 * - Hanya status = PUBLISHED
 * - 404 jika slug tidak ada atau status ≠ PUBLISHED
 * - Harga sudah final via resolvePrice()
 * - Tidak ada engine field
 * - SEO-friendly
 * 
 * Response:
 * {
 *   id, name, slug, description, imageGallery[],
 *   priceResolved, category { name, slug },
 *   seo { title, description, schemaJson }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePrice, type WholesalePrice } from '@/lib/price-resolver';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import { ProductDetailSchema, validateApiResponse } from '@/lib/api-response-schemas';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now();
  
  try {
    // Check for preview mode
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';
    
    // If preview mode, require authentication
    if (isPreview) {
      const { getServerSession } = await import('@/lib/auth');
      const session = await getServerSession();
      
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized: Preview mode requires authentication' },
          { status: 401 }
        );
      }
      
      // Check if user has admin access
      const userRole = (session.user as any)?.role;
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required for preview' },
          { status: 403 }
        );
      }
    } else {
      // PHASE G: Rate limiting for public API (300 req/menit/IP)
      const { applyRateLimit } = await import('@/lib/rate-limit-phase-g');
      const rateLimitResult = await applyRateLimit(request, 'public');
      if (!rateLimitResult.allowed && rateLimitResult.response) {
        return rateLimitResult.response;
      }
    }
    
    // Fetch product by slug with all relations needed
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        wholesalePrices: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    // 404 if product doesn't exist
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // In preview mode, allow any status; otherwise only PUBLISHED
    if (!isPreview && product.status !== PRODUCT_STATUS.PUBLISHED) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Resolve price (default quantity = 1)
    const wholesalePricesForResolver: WholesalePrice[] = product.wholesalePrices.map(wp => ({
      minQty: wp.minQty,
      price: wp.price,
    }));

    const priceResolution = resolvePrice({
      basePrice: product.price,
      discountPrice: product.discountPrice,
      wholesalePrices: wholesalePricesForResolver,
      quantity: 1,
    });

    // Parse image gallery
    const imageGallery = product.images ? JSON.parse(product.images) : [];
    if (product.imageUrl && !imageGallery.includes(product.imageUrl)) {
      imageGallery.unshift(product.imageUrl); // Add main image to gallery if not already included
    }

    // Fetch SEO metadata
    const seoMetadata = await prisma.seoMetadata.findFirst({
      where: {
        entityType: 'product',
        entityId: product.id,
        brandId: product.brandId,
        // localeId is optional on SeoMetadata; prefer locale-specific if present
        OR: [{ localeId: product.localeId }, { localeId: null }],
      },
      select: {
        metaTitle: true,
        metaDescription: true,
        schemaJson: true,
      },
    });

    // Build public response (no sensitive data)
    const response = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageGallery,
      priceResolved: priceResolution.finalPrice,
      shopeeUrl: product.shopeeUrl,
      tokopediaUrl: product.tokopediaUrl,
      category: {
        name: product.category.name,
        slug: product.category.slug,
      },
      // Additional information fields (if available)
      additionalInfo: {
        problemSolution: product.problemSolution || null,
        applicationMethod: product.applicationMethod || null,
        dosage: product.dosage || null,
        advantages: product.advantages || null,
        safetyNotes: product.safetyNotes || null,
      },
      seo: {
        title: seoMetadata?.metaTitle || product.metaTitle || product.name,
        description: seoMetadata?.metaDescription || product.metaDescription || product.shortDescription || product.description.substring(0, 160),
        schemaJson: seoMetadata?.schemaJson || product.seoSchema || null,
      },
    };

    // PHASE B: Validate response schema before returning
    try {
      const validatedResponse = validateApiResponse(
        response,
        ProductDetailSchema,
        `GET /api/public/products/${params.slug}`
      );

      // PHASE G: Record metrics
      const duration = Date.now() - startTime;
      const { recordRequest } = await import('@/lib/basic-monitoring');
      recordRequest('GET', `/api/public/products/${params.slug}`, 200, duration);

      // Return with cache headers (no cache for preview mode)
      const cacheHeaders = isPreview
        ? { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        : { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };
      
      return NextResponse.json(validatedResponse, {
        headers: cacheHeaders,
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      const duration = Date.now() - startTime;
      const { logError } = await import('@/lib/structured-logger');
      const { recordRequest } = await import('@/lib/basic-monitoring');
      
      logError('Product detail response validation failed', validationError, {
        endpoint: `/api/public/products/${params.slug}`,
        method: 'GET',
      });
      recordRequest('GET', `/api/public/products/${params.slug}`, 500, duration);
      
      console.error('[API-VALIDATION] Product detail response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // PHASE G: Log error and record metrics
    const duration = Date.now() - startTime;
    const { logError } = await import('@/lib/structured-logger');
    const { recordRequest } = await import('@/lib/basic-monitoring');
    
    logError('Error fetching public product', error, {
      endpoint: `/api/public/products/${params.slug}`,
      method: 'GET',
    });
    recordRequest('GET', `/api/public/products/${params.slug}`, 500, duration);
    
    console.error('Error fetching public product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
