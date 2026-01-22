import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeImagePathSafe, normalizeImagePaths } from '@/lib/normalizeImagePath';

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

async function resolveBrandIdFromRequest(request: NextRequest, session: any): Promise<string> {
  const headerBrandId = request.headers.get('x-brand-id');
  if (headerBrandId) return headerBrandId;

  if (session?.user?.email) {
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
      select: { brandId: true, role: true },
    });
    if (admin?.brandId) return admin.brandId;
  }

  const firstActiveBrand = await prisma.brand.findFirst({
    where: { brandStatus: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveBrand) {
    throw new Error('No ACTIVE brand found. Please create a brand first.');
  }
  return firstActiveBrand.id;
}

async function resolveLocaleIdFromRequest(request: NextRequest, brandId: string): Promise<string> {
  const headerLocaleId = request.headers.get('x-locale-id');
  if (headerLocaleId) return headerLocaleId;

  const defaultLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (defaultLocale) return defaultLocale.id;

  const firstActiveLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveLocale) {
    throw new Error('No ACTIVE locale found for brand. Please create a locale first.');
  }
  return firstActiveLocale.id;
}

// GET /api/products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    const brandId = await resolveBrandIdFromRequest(request, session);
    const localeId = await resolveLocaleIdFromRequest(request, brandId);

    // Auto-generate SEO if not provided
    const metaTitle = data.metaTitle || `${data.name} - TOKO TANI ONLINE`;
    const metaDescription =
      data.metaDescription || data.shortDescription || data.description.substring(0, 160);

    // Check if slug exists
    const existing = await prisma.product.findFirst({
      where: { slug: data.slug, brandId, localeId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    // M-02: Normalize image paths before saving
    const normalizedImageUrl = normalizeImagePathSafe(data.imageUrl);
    const normalizedImages = normalizeImagePaths(data.images);

    const product = await prisma.product.create({
      data: {
        ...data,
        brandId,
        localeId,
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
          brandId,
        },
      },
      update: {
        metaTitle,
        metaDescription,
        metaKeywords: data.features ? JSON.stringify(data.features) : undefined,
        schemaJson: product.seoSchema || null,
        canonicalUrl: `/produk/${product.slug}`,
        localeId,
      },
      create: {
        entityType: 'product',
        entityId: product.id,
        brandId,
        localeId,
        metaTitle,
        metaDescription,
        metaKeywords: data.features ? JSON.stringify(data.features) : undefined,
        schemaJson: product.seoSchema || null,
        canonicalUrl: `/produk/${product.slug}`,
      },
    });

    // Create auto jobs for engines when product is created and active
    // DISABLED: Engine module not available
    // if (product.isActive) {
    //   import('@/lib/seo-titan/auto-worker')
    //     .then(({ createEngineJob }) => createEngineJob('product_created', {
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
