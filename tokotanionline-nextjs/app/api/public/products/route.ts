/**
 * STEP P2A-1: Public Products List API (READ-ONLY)
 * GET /api/public/products
 * 
 * Purpose: Public read-only API untuk product listing
 * - Hanya data PUBLISHED
 * - Pagination support
 * - Category filter support
 * - Harga via resolvePrice()
 * - Tidak expose raw pricing/discount logic
 * 
 * Query params:
 * - category: slug (optional)
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - sort: string (optional) - 'newest' | 'price_asc' | 'price_desc' (default: 'newest')
 * 
 * Response:
 * {
 *   items: [{ id, name, slug, imageUrl, priceResolved, category }],
 *   pagination: { page, limit, total }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePrice, type WholesalePrice } from '@/lib/price-resolver';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import { ProductListResponseSchema, validateApiResponse } from '@/lib/api-response-schemas';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100 per page
    const sortParam = searchParams.get('sort') || 'newest';

    // Build where clause
    const where: any = {
      status: PRODUCT_STATUS.PUBLISHED,
      isActive: true,
    };

    // Filter by category if provided
    if (categorySlug) {
      const category = await prisma.productCategory.findFirst({
        where: { slug: categorySlug },
        select: { id: true },
      });

      if (category) {
        where.categoryId = category.id;
      } else {
        // Category not found, return empty result
        return NextResponse.json({
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        }, {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          },
        });
      }
    }

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    // Build orderBy based on sort parameter
    let orderBy: any[] = [];
    switch (sortParam) {
      case 'price_asc':
        // We'll sort by price after resolving, so fetch all and sort in memory
        orderBy = [{ createdAt: 'desc' }]; // Temporary, will sort after price resolution
        break;
      case 'price_desc':
        // We'll sort by price after resolving, so fetch all and sort in memory
        orderBy = [{ createdAt: 'desc' }]; // Temporary, will sort after price resolution
        break;
      case 'newest':
      default:
        orderBy = [
          { promotedAt: 'desc' },
          { createdAt: 'desc' },
        ];
        break;
    }

    // Fetch products with pagination
    // For price sorting, we need to fetch more and sort, then paginate
    const needsPriceSort = sortParam === 'price_asc' || sortParam === 'price_desc';
    const fetchLimit = needsPriceSort ? 1000 : limit; // Fetch more for price sorting
    const fetchSkip = needsPriceSort ? 0 : (page - 1) * limit;

    const productsRaw = await prisma.product.findMany({
      where,
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
      skip: fetchSkip,
      take: fetchLimit,
      orderBy,
    });

    // Resolve prices for all products
    let items = productsRaw.map(product => {
      const wholesalePricesForResolver: WholesalePrice[] = product.wholesalePrices.map(wp => ({
        minQty: wp.minQty,
        price: wp.price,
      }));

      const priceResolution = resolvePrice({
        basePrice: product.price,
        discountPrice: product.discountPrice,
        wholesalePrices: wholesalePricesForResolver,
        quantity: 1, // Default quantity for listing
      });

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        priceResolved: priceResolution.finalPrice,
        price: product.price,
        discountPrice: product.discountPrice,
        stock: product.stock,
        unit: product.unit,
        shopeeUrl: product.shopeeUrl,
        tokopediaUrl: product.tokopediaUrl,
        shortDescription: product.shortDescription,
        packagingVariants: product.packagingVariants,
        category: {
          name: product.category.name,
          slug: product.category.slug,
        },
      };
    });

    // Sort by price if needed
    if (sortParam === 'price_asc') {
      items.sort((a, b) => a.priceResolved - b.priceResolved);
    } else if (sortParam === 'price_desc') {
      items.sort((a, b) => b.priceResolved - a.priceResolved);
    }

    // Apply pagination if we fetched all for price sorting
    if (needsPriceSort) {
      items = items.slice((page - 1) * limit, page * limit);
    }

    // Build response
    const response = {
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };

    // PHASE B: Validate response schema before returning
    try {
      const validatedResponse = validateApiResponse(
        response,
        ProductListResponseSchema,
        'GET /api/public/products'
      );

      // Return with cache headers
      return NextResponse.json(validatedResponse, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    } catch (validationError: any) {
      // PHASE B: If validation fails, return 500 + log
      console.error('[API-VALIDATION] Product list response validation failed:', validationError);
      return NextResponse.json(
        { error: 'Internal server error: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching public products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
