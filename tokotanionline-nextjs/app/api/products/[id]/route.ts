import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeImagePathSafe, normalizeImagePaths } from '@/lib/normalizeImagePath';
import { resolvePrice, type WholesalePrice } from '@/lib/price-resolver';
import { PRODUCT_STATUS } from '@/lib/product-rules';

const productSchema = z.object({
  name: z.string(),
  slug: z.string(),
  categoryId: z.string(),
  description: z.string(),
  shortDescription: z.string().optional(),
  problemSolution: z.string().optional(),
  applicationMethod: z.string().optional(),
  dosage: z.string().optional(),
  advantages: z.string().optional(),
  safetyNotes: z.string().optional(),
  price: z.number(),
  discountPrice: z.number().optional().nullable(),
  stock: z.number(),
  unit: z.string(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  badge: z.string().optional(),
  salesWeight: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  shopeeUrl: z.string().optional(),
  tokopediaUrl: z.string().optional(),
  whatsappCta: z.string().optional(),
  marketplaceCta: z.string().optional(),
  scarcityText: z.string().optional(),
  features: z.array(z.string()).optional(),
  cropType: z.string().optional(),
  pestTargets: z.array(z.string()).optional(),
  activeIngredients: z.array(z.string()).optional(),
  packagingVariants: z.array(z.string()).optional(),
  usageStage: z.string().optional(),
});

/**
 * STEP 19F-1: Public / Engine Product Read API
 * 
 * Purpose: Read-only API for engine and public frontend
 * - Only PUBLISHED products visible
 * - Price resolved via resolvePrice()
 * - Category & subCategory included
 * - Wholesale raw data NOT exposed
 * - Status internal NOT exposed
 * - Attributes sensitive NOT exposed
 */

// GET /api/products/[id] - Public/Engine read (PUBLISHED only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get quantity from query param (default = 1)
    const { searchParams } = new URL(request.url);
    const quantity = parseInt(searchParams.get('quantity') || '1', 10);

    // Fetch product with all relations needed for price resolution
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        subCategory: true,
        wholesalePrices: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Only PUBLISHED products are visible to public/engine
    if (product.status !== PRODUCT_STATUS.PUBLISHED) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Resolve price using price-resolver
    const wholesalePricesForResolver: WholesalePrice[] = product.wholesalePrices.map(wp => ({
      minQty: wp.minQty,
      price: wp.price,
    }));

    const priceResolution = resolvePrice({
      basePrice: product.price,
      discountPrice: product.discountPrice,
      wholesalePrices: wholesalePricesForResolver,
      quantity: quantity,
    });

    // Build safe response (no sensitive data)
    const safeProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      problemSolution: product.problemSolution,
      applicationMethod: product.applicationMethod,
      dosage: product.dosage,
      advantages: product.advantages,
      safetyNotes: product.safetyNotes,
      stock: product.stock,
      unit: product.unit,
      imageUrl: product.imageUrl,
      images: product.images ? JSON.parse(product.images) : null,
      isFeatured: product.isFeatured,
      badge: product.badge,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      shopeeUrl: product.shopeeUrl,
      tokopediaUrl: product.tokopediaUrl,
      whatsappCta: product.whatsappCta,
      marketplaceCta: product.marketplaceCta,
      scarcityText: product.scarcityText,
      features: product.features ? JSON.parse(product.features) : null,
      cropType: product.cropType,
      pestTargets: product.pestTargets ? JSON.parse(product.pestTargets) : null,
      activeIngredients: product.activeIngredients ? JSON.parse(product.activeIngredients) : null,
      packagingVariants: product.packagingVariants ? JSON.parse(product.packagingVariants) : null,
      usageStage: product.usageStage,
      category: product.category,
      subCategory: product.subCategory,
      // Resolved price (not raw pricing data)
      price: priceResolution.finalPrice,
      pricePerUnit: priceResolution.pricePerUnit,
      priceSource: priceResolution.source,
      appliedDiscount: priceResolution.appliedDiscount,
      appliedTier: priceResolution.appliedTier ? {
        minQty: priceResolution.appliedTier.minQty,
        price: priceResolution.appliedTier.price,
      } : null,
      // Base price info (for reference, not sensitive)
      basePrice: product.price,
      discountPrice: product.discountPrice,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // DO NOT include:
      // - status (internal)
      // - wholesalePrices raw (sensitive)
      // - attributes (sensitive)
      // - isActive (internal flag)
      // - salesWeight (internal)
    };

    return NextResponse.json({ product: safeProduct });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    // Auto-generate SEO if not provided
    const metaTitle = data.metaTitle || `${data.name} - TOKO TANI ONLINE`;
    const metaDescription =
      data.metaDescription || data.shortDescription || data.description.substring(0, 160);

    // Check if slug exists (excluding current product)
    const existing = await prisma.product.findFirst({
      where: {
        slug: data.slug,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    // M-02: Normalize image paths before saving
    const normalizedImageUrl = normalizeImagePathSafe(data.imageUrl);
    const normalizedImages = normalizeImagePaths(data.images);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        badge: data.badge || 'none',
        salesWeight: data.salesWeight ?? 0,
        metaTitle,
        metaDescription,
        imageUrl: normalizedImageUrl,
        features: data.features ? JSON.stringify(data.features) : null,
        pestTargets: data.pestTargets ? JSON.stringify(data.pestTargets) : null,
        activeIngredients: data.activeIngredients ? JSON.stringify(data.activeIngredients) : null,
        packagingVariants: data.packagingVariants ? JSON.stringify(data.packagingVariants) : null,
        images: normalizedImages.length > 0 ? JSON.stringify(normalizedImages) : null,
      },
      include: { category: true },
    });

    await prisma.seoMetadata.upsert({
      where: {
        entityType_entityId_brandId: {
          entityType: 'product',
          entityId: product.id,
          brandId: product.brandId,
        },
      },
      update: {
        metaTitle,
        metaDescription,
        metaKeywords: data.features ? JSON.stringify(data.features) : undefined,
        schemaJson: product.seoSchema || null,
        canonicalUrl: `/produk/${product.slug}`,
        localeId: product.localeId,
      },
      create: {
        entityType: 'product',
        entityId: product.id,
        brandId: product.brandId,
        localeId: product.localeId,
        metaTitle,
        metaDescription,
        metaKeywords: data.features ? JSON.stringify(data.features) : undefined,
        schemaJson: product.seoSchema || null,
        canonicalUrl: `/produk/${product.slug}`,
      },
    });

    // Create auto jobs for engines when product is updated
    // DISABLED: Engine module not available
    // if (product.isActive) {
    //   import('@/lib/seo-titan/auto-worker')
    //     .then(({ createEngineJob }) => createEngineJob('product_updated', {
    //       entityId: product.id,
    //       entityType: 'product',
    //       description: product.description,
    //       content: product.description,
    //       primaryKeyword: data.features?.[0] || product.name,
    //     }))
    //     .catch((e) => console.error('Auto worker error:', e));
    // }

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get product first to check status and usage
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        status: true,
        blogProducts: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // FITUR 4: Delete Protection
    // ❌ Tidak boleh delete produk PUBLISHED
    if (product.status === PRODUCT_STATUS.PUBLISHED) {
      return NextResponse.json(
        {
          error: 'Cannot delete published product',
          message:
            'Tidak dapat menghapus produk yang sudah dipublish. Silakan unpublish terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    // ❌ Tidak boleh delete jika dipakai (blog, order, campaign, dll.)
    // Check if product is used in blogs
    if (product.blogProducts && product.blogProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product',
          message:
            'Produk tidak dapat dihapus karena masih digunakan di blog/artikel. Silakan hapus referensi terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    // TODO: Add checks for orders, campaigns, etc. when those models exist

    // Delete product
    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    // Handle foreign key constraint errors
    if (error.code === 'P2003' || error.message?.includes('foreign key')) {
      return NextResponse.json(
        {
          error: 'Cannot delete product',
          message:
            'Produk tidak dapat dihapus karena masih digunakan di sistem. Silakan hapus referensi terlebih dahulu.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

