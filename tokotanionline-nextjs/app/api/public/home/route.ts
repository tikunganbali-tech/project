/**
 * STEP P2A-1: Public Homepage API (READ-ONLY)
 * GET /api/public/home
 * 
 * Purpose: Public read-only API untuk homepage data
 * - Hanya data PUBLISHED
 * - Tidak ada write/mutation
 * - Tidak ada engine trigger
 * - Tidak ada admin/session dependency
 * - Cache-friendly (ISR)
 * 
 * Response:
 * {
 *   hero: { title, subtitle },
 *   categories: [{ id, name, slug, imageUrl }],
 *   featuredProducts: [{ id, name, slug, imageUrl, priceResolved }],
 *   latestPosts: [{ id, title, slug, excerpt, publishedAt }]
 * }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePrice, type WholesalePrice } from '@/lib/price-resolver';
import { PRODUCT_STATUS } from '@/lib/product-rules';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET() {
  try {
    // Fetch site settings for hero content (defensive)
    const siteSettings = await prisma.siteSettings.findFirst({
      where: { id: '1' },
      select: {
        heroTitle: true,
        heroSubtitle: true,
      },
    }).catch(() => null);

    // Build hero response (defensive)
    const hero = {
      title: siteSettings?.heroTitle || 'Solusi Lengkap Kebutuhan Pertanian Anda',
      subtitle: siteSettings?.heroSubtitle || 'Benih berkualitas, fungisida efektif, pupuk bernutrisi, dan alat pertanian modern untuk hasil panen maksimal',
    };

    // PHASE 1: Fetch root categories with 'product' context - defensive
    const categories = await prisma.category.findMany({
      where: {
        parentId: null, // Root categories only
        isActive: true,
        contexts: {
          some: {
            context: 'product',
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    }).catch(() => []);

    // Map to expected format (imageUrl not in unified Category, set to null)
    const categoriesFormatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      imageUrl: null, // Unified Category doesn't have imageUrl
    }));

    // Fetch featured products (PUBLISHED only, isFeatured = true) - defensive
    const featuredProductsRaw = await prisma.product.findMany({
      where: {
        status: PRODUCT_STATUS.PUBLISHED,
        isFeatured: true,
        isActive: true,
      },
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
      take: 9,
      orderBy: [
        { promotedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    }).catch(() => []);

    // Resolve prices for featured products (defensive)
    const featuredProducts = (featuredProductsRaw || []).map(product => {
      // Guard: category might be null
      if (!product.category) {
        return null;
      }

      // Guard: wholesalePrices might be null/undefined
      const wholesalePricesForResolver: WholesalePrice[] = (product.wholesalePrices || []).map(wp => ({
        minQty: wp.minQty,
        price: wp.price,
      }));

      const priceResolution = resolvePrice({
        basePrice: product.price || 0,
        discountPrice: product.discountPrice || null,
        wholesalePrices: wholesalePricesForResolver,
        quantity: 1, // Default quantity for homepage
      });

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        priceResolved: priceResolution.finalPrice,
        category: {
          name: product.category.name,
          slug: product.category.slug,
        },
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    // 🔒 DISABLED: Blog query temporarily disabled for stability
    // BlogPost table not ready - will be re-enabled in PHASE BLOG ENGINE
    // const latestPosts = await prisma.blogPost.findMany({
    //   where: {
    //     status: 'PUBLISHED',
    //   },
    //   select: {
    //     id: true,
    //     title: true,
    //     slug: true,
    //     excerpt: true,
    //     publishedAt: true,
    //   },
    //   take: 3,
    //   orderBy: {
    //     publishedAt: 'desc',
    //   },
    // }).catch(() => []);
    
    // Hard disable: Zero DB access, explicit empty array
    const latestPosts: any[] = [];

    // Build response (all fields guaranteed safe)
    const response = {
      hero,
      categories: categoriesFormatted || [],
      featuredProducts: featuredProducts || [],
      latestPosts: latestPosts || [],
    };

    // Return with cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching public homepage data:', error);
    // Return 200 with empty state, not 500
    return NextResponse.json(
      {
        hero: {
          title: 'Solusi Lengkap Kebutuhan Pertanian Anda',
          subtitle: 'Benih berkualitas, fungisida efektif, pupuk bernutrisi, dan alat pertanian modern untuk hasil panen maksimal',
        },
        categories: [],
        featuredProducts: [],
        latestPosts: [],
      },
      { status: 200 }
    );
  }
}
