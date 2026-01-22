/**
 * STEP 3.1.2: Product Save/Update API (Manual Control)
 * 
 * Purpose: Save or update product with manual status control
 * - If id exists → update
 * - If not → create
 * - Status can be set to DRAFT, PUBLISHED, or ARCHIVED
 * - Default status = DRAFT if not specified
 * - Supports subCategoryId
 * - Publishing requires product.publish permission (super_admin only)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getDefaultStatus, PRODUCT_STATUS, isPublishable, canTransitionTo, type ProductForValidation } from '@/lib/product-rules';
import { hasPermission } from '@/lib/permissions';
import { ensureUniqueProductSlug, generateSlugFromName } from '@/lib/slug-utils';
import { logActivity } from '@/lib/activity-logger';
import { normalizeImagePathSafe, normalizeImagePaths } from '@/lib/normalizeImagePath';
import { ensureProductExtraInfo } from '@/lib/product-extra-info';
import { validateProductPhaseA, generateSlugFromTitle } from '@/lib/product-validation-phase-a';

const productSchema = z.object({
  id: z.string().optional(), // Optional for create/update logic
  name: z.string().min(1, 'Nama produk diperlukan'),
  slug: z.string().min(1, 'Slug diperlukan'),
  categoryId: z.string().min(1, 'Kategori diperlukan'),
  subCategoryId: z.string().nullable().optional(), // Subcategory optional
  status: z.enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.ARCHIVED]).optional(), // Status field
  description: z.string().min(1, 'Deskripsi diperlukan'),
  shortDescription: z.string().optional(),
  specifications: z.string().optional(), // Rich text specifications
  sku: z.string().optional(), // Stock Keeping Unit
  problemSolution: z.string().optional(),
  applicationMethod: z.string().optional(),
  dosage: z.string().optional(),
  advantages: z.string().optional(),
  safetyNotes: z.string().optional(),
  price: z.number().min(0, 'Harga harus positif'),
  discountPrice: z.number().optional().nullable(),
  stock: z.number().min(0, 'Stok harus positif'),
  unit: z.string().min(1, 'Unit diperlukan'),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  badge: z.string().optional(),
  salesWeight: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  seoSchema: z.string().optional(), // QC status and SEO data stored as JSON string
  shopeeUrl: z.string().url().optional().or(z.literal('')),
  tokopediaUrl: z.string().url().optional().or(z.literal('')),
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

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
    select: { brandId: true, role: true },
  });

  if (admin?.brandId) return admin.brandId;

  // super_admin fallback: first ACTIVE brand
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

  // Default locale for brand
  const defaultLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (defaultLocale) return defaultLocale.id;

  // Fallback: first active locale
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

// POST /api/admin/products/save
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // PHASE G: Rate limiting for admin API (60 req/menit/IP)
    const { applyRateLimit } = await import('@/lib/rate-limit-phase-g');
    const rateLimitResult = await applyRateLimit(request, 'admin');
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // PHASE G: CSRF protection (optional - NextAuth already handles this, but we can add explicit check)
    // Note: NextAuth built-in CSRF protection is sufficient, but we can add explicit validation if needed

    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    const brandId = await resolveBrandIdFromRequest(request, session);
    const localeId = await resolveLocaleIdFromRequest(request, brandId);

    // Determine status: use provided status, or default to DRAFT
    const targetStatus = data.status || getDefaultStatus();

    // PHASE A: Data Contract & Validation - Validasi keras sebelum save
    const phaseAValidation = validateProductPhaseA({
      slug: data.slug,
      shortDescription: data.shortDescription,
      specifications: data.specifications,
      seoSchema: data.seoSchema,
      status: targetStatus,
      publishedAt: targetStatus === PRODUCT_STATUS.PUBLISHED ? (body.publishedAt ? new Date(body.publishedAt) : null) : null,
      name: data.name,
    });

    // Jika ada error validasi, return 422 dengan detail error
    if (!phaseAValidation.valid) {
      return NextResponse.json(
        {
          error: 'Validation error (PHASE A)',
          message: 'Data tidak memenuhi kontrak data PHASE A',
          issues: phaseAValidation.errors,
          fixes: phaseAValidation.fixes,
        },
        { status: 422 }
      );
    }

    // Apply fixes jika ada (auto-regenerate slug, normalize shortDescription, set publishedAt)
    let finalSlug = data.slug;
    if (phaseAValidation.fixes?.slug) {
      finalSlug = phaseAValidation.fixes.slug;
    }

    let finalShortDescription = data.shortDescription || null;
    if (phaseAValidation.fixes?.shortDescription) {
      finalShortDescription = phaseAValidation.fixes.shortDescription;
    }

    let finalPublishedAt: Date | null = null;
    if (targetStatus === PRODUCT_STATUS.PUBLISHED) {
      finalPublishedAt = phaseAValidation.fixes?.publishedAt || new Date();
    }

    // If trying to publish, check permission
    if (targetStatus === PRODUCT_STATUS.PUBLISHED && !hasPermission(userRole, 'product.publish')) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can publish products' },
        { status: 403 }
      );
    }

    // If subCategoryId provided, validate it's a child of selected category
    if (data.subCategoryId) {
      const subCategory = await prisma.productCategory.findUnique({
        where: { id: data.subCategoryId },
        include: { parent: true },
      });

      if (!subCategory) {
        return NextResponse.json({ error: 'Subcategory tidak ditemukan' }, { status: 400 });
      }

      if (subCategory.brandId !== brandId) {
        return NextResponse.json({ error: 'Forbidden: Subcategory outside active brand scope' }, { status: 403 });
      }

      if (!subCategory.parentId || subCategory.parentId !== data.categoryId) {
        return NextResponse.json(
          { error: 'Subcategory tidak sesuai dengan parent category' },
          { status: 400 }
        );
      }
    }

    // Validate category belongs to active brand scope
    const category = await prisma.productCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true, brandId: true, name: true },
    });
    if (!category) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 });
    }
    if (category.brandId !== brandId) {
      return NextResponse.json({ error: 'Forbidden: Category outside active brand scope' }, { status: 403 });
    }

    // M-09: Ensure all extra info fields are filled before save
    const ensuredExtraInfo = ensureProductExtraInfo(
      {
        specifications: data.specifications,
        problemSolution: data.problemSolution,
        applicationMethod: data.applicationMethod,
        dosage: data.dosage,
        advantages: data.advantages,
        safetyNotes: data.safetyNotes,
      },
      data.name,
      category.name
    );

    // Auto-generate SEO if not provided
    const metaTitle = data.metaTitle || `${data.name} - TOKO TANI ONLINE`;
    const metaDescription =
      data.metaDescription || data.shortDescription || data.description.substring(0, 160);

    // If id provided, update existing product
    if (data.id) {
      // Check if product exists
      const existing = await prisma.product.findUnique({
        where: { id: data.id },
        select: {
          id: true,
          slug: true,
          status: true,
          isActive: true,
          schedulerKeywordId: true, // M-08
          publishSource: true, // M-08
          imageUrl: true,
          isFeatured: true,
          badge: true,
          salesWeight: true,
          seoSchema: true,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // M-08: Guard - Check if scheduler is PROCESSING this content
      if (existing.schedulerKeywordId) {
        const keyword = await prisma.scheduleKeyword.findUnique({
          where: { id: existing.schedulerKeywordId },
          select: { status: true },
        });
        
        if (keyword && keyword.status === 'PROCESSING') {
          return NextResponse.json(
            {
              error: 'Konten sedang diproses scheduler.',
              message: 'Konten sedang diproses scheduler. Silakan tunggu hingga proses selesai.',
            },
            { status: 409 }
          );
        }
      }

      // Ensure slug is unique (auto-handle duplicates with -2, -3, etc.)
      // Only check if slug is different from current or if current slug doesn't exist in our brand/locale
      if (finalSlug !== existing.slug) {
        // Slug changed, need to ensure uniqueness
        finalSlug = await ensureUniqueProductSlug(
          finalSlug,
          brandId,
          localeId,
          data.id
        );
      }

      // Validate status transition if changing status
      if (targetStatus !== existing.status) {
        const productForValidation: ProductForValidation = {
          status: existing.status,
          name: data.name,
          price: data.price,
          stock: data.stock,
          isActive: data.isActive ?? existing.isActive,
          categoryId: data.categoryId,
          description: data.description,
          imageUrl: data.imageUrl || existing.imageUrl,
        };

        const canTransition = canTransitionTo(
          existing.status,
          targetStatus,
          productForValidation
        );

        if (!canTransition) {
          return NextResponse.json(
            {
              error: 'Invalid status transition',
              message: `Cannot transition from ${existing.status || 'null'} to ${targetStatus}`,
            },
            { status: 400 }
          );
        }

        // If publishing, check publishability
        if (targetStatus === PRODUCT_STATUS.PUBLISHED) {
          const publishable = isPublishable(productForValidation);
          if (!publishable) {
            return NextResponse.json(
              {
                error: 'Product is not publishable',
                message:
                  'Product does not meet all requirements for publishing. Please check: name, price, category, description, and image.',
              },
              { status: 400 }
            );
          }
        }
      }

      // M-02: Normalize image paths before saving
      const normalizedImageUrl = normalizeImagePathSafe(data.imageUrl);
      const normalizedImages = normalizeImagePaths(data.images);

      // M-09: Use ensured extra info (all fields guaranteed to be filled)
      // Update product
      const product = await prisma.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: finalSlug,
          categoryId: data.categoryId,
          subCategoryId: data.subCategoryId || null,
          description: data.description,
          shortDescription: finalShortDescription,
          specifications: ensuredExtraInfo.specifications || null,
          sku: data.sku || null,
          problemSolution: ensuredExtraInfo.problemSolution,
          applicationMethod: ensuredExtraInfo.applicationMethod,
          dosage: ensuredExtraInfo.dosage,
          advantages: ensuredExtraInfo.advantages,
          safetyNotes: ensuredExtraInfo.safetyNotes,
          price: data.price,
          discountPrice: data.discountPrice,
          stock: data.stock,
          unit: data.unit,
          imageUrl: normalizedImageUrl,
          images: normalizedImages.length > 0 ? JSON.stringify(normalizedImages) : null,
          isFeatured: data.isFeatured ?? existing.isFeatured,
          isActive: data.isActive ?? existing.isActive,
          badge: data.badge || existing.badge || 'none',
          salesWeight: data.salesWeight ?? existing.salesWeight ?? 0,
          metaTitle,
          metaDescription,
          seoSchema: data.seoSchema || existing.seoSchema || null, // M-11: Preserve seoSchema for QC validation
          shopeeUrl: data.shopeeUrl,
          tokopediaUrl: data.tokopediaUrl,
          whatsappCta: data.whatsappCta,
          marketplaceCta: data.marketplaceCta,
          scarcityText: data.scarcityText,
          features: data.features ? JSON.stringify(data.features) : null,
          cropType: data.cropType,
          pestTargets: data.pestTargets ? JSON.stringify(data.pestTargets) : null,
          activeIngredients: data.activeIngredients ? JSON.stringify(data.activeIngredients) : null,
          packagingVariants: data.packagingVariants ? JSON.stringify(data.packagingVariants) : null,
          usageStage: data.usageStage,
          status: targetStatus,
          ...(targetStatus === PRODUCT_STATUS.PUBLISHED && { publishedAt: finalPublishedAt || new Date() }),
          // M-08: Set publishSource to MANUAL for manual saves (if not already set by scheduler)
          publishSource: (!existing.publishSource || existing.publishSource !== 'SCHEDULER') ? 'MANUAL' : existing.publishSource,
        },
        include: { category: true, subCategory: true },
      });

      // Log activity for status change
      if (targetStatus !== existing.status) {
        const actorId = (session.user as any).id;
        await logActivity({
          actorId,
          action: targetStatus === PRODUCT_STATUS.PUBLISHED ? 'PUBLISH' : 'UPDATE',
          entityType: 'PRODUCT',
          entityId: data.id,
          metadata: {
            name: data.name,
            statusBefore: existing.status,
            statusAfter: targetStatus,
          },
        });
      }

      // PHASE G: Log success and record metrics
      const duration = Date.now() - startTime;
      const { logInfo } = await import('@/lib/structured-logger');
      const { recordRequest } = await import('@/lib/basic-monitoring');
      
      logInfo('Product updated successfully', {
        productId: data.id,
        status: targetStatus,
        duration,
      });
      recordRequest('POST', '/api/admin/products/save', 200, duration);

      return NextResponse.json({
        product,
        message: `Product updated with status: ${targetStatus}`,
        ...(finalSlug !== data.slug && { slugModified: true, finalSlug }),
      });
    } else {
      // Create new product
      // Ensure slug is unique (auto-handle duplicates)
      const uniqueSlug = await ensureUniqueProductSlug(
        finalSlug,
        brandId,
        localeId
      );
      
      // Use unique slug (may be same as input or modified)
      finalSlug = uniqueSlug;

      // Validate publishability if creating as PUBLISHED
      if (targetStatus === PRODUCT_STATUS.PUBLISHED) {
        const productForValidation: ProductForValidation = {
          status: null,
          name: data.name,
          price: data.price,
          stock: data.stock,
          isActive: data.isActive ?? true,
          categoryId: data.categoryId,
          description: data.description,
          imageUrl: data.imageUrl || null,
        };

        const publishable = isPublishable(productForValidation);
        if (!publishable) {
          return NextResponse.json(
            {
              error: 'Product is not publishable',
              message:
                'Product does not meet all requirements for publishing. Please check: name, price, category, description, and image.',
            },
            { status: 400 }
          );
        }
      }

      // M-02: Normalize image paths before saving
      const normalizedImageUrl = normalizeImagePathSafe(data.imageUrl);
      const normalizedImages = normalizeImagePaths(data.images);

      // M-09: Use ensured extra info (all fields guaranteed to be filled)
      // Create product
      const product = await prisma.product.create({
        data: {
          name: data.name,
          slug: finalSlug,
          brandId,
          localeId,
          categoryId: data.categoryId,
          subCategoryId: data.subCategoryId || null,
          description: data.description,
          shortDescription: finalShortDescription,
          specifications: ensuredExtraInfo.specifications || null,
          sku: data.sku || null,
          problemSolution: ensuredExtraInfo.problemSolution,
          applicationMethod: ensuredExtraInfo.applicationMethod,
          dosage: ensuredExtraInfo.dosage,
          advantages: ensuredExtraInfo.advantages,
          safetyNotes: ensuredExtraInfo.safetyNotes,
          price: data.price,
          discountPrice: data.discountPrice,
          stock: data.stock,
          unit: data.unit,
          imageUrl: normalizedImageUrl,
          images: normalizedImages.length > 0 ? JSON.stringify(normalizedImages) : null,
          isFeatured: data.isFeatured ?? false,
          isActive: data.isActive ?? true,
          badge: data.badge || 'none',
          salesWeight: data.salesWeight ?? 0,
          metaTitle,
          metaDescription,
          seoSchema: data.seoSchema || null, // M-11: Save seoSchema for QC validation
          shopeeUrl: data.shopeeUrl,
          tokopediaUrl: data.tokopediaUrl,
          whatsappCta: data.whatsappCta,
          marketplaceCta: data.marketplaceCta,
          scarcityText: data.scarcityText,
          features: data.features ? JSON.stringify(data.features) : null,
          cropType: data.cropType,
          pestTargets: data.pestTargets ? JSON.stringify(data.pestTargets) : null,
          activeIngredients: data.activeIngredients ? JSON.stringify(data.activeIngredients) : null,
          packagingVariants: data.packagingVariants ? JSON.stringify(data.packagingVariants) : null,
          usageStage: data.usageStage,
          status: targetStatus,
          ...(targetStatus === PRODUCT_STATUS.PUBLISHED && { publishedAt: finalPublishedAt || new Date() }),
        },
        include: { category: true, subCategory: true },
      });

      // Log activity
      const actorId = (session.user as any).id;
      await logActivity({
        actorId,
        action: targetStatus === PRODUCT_STATUS.PUBLISHED ? 'PUBLISH' : 'CREATE',
        entityType: 'PRODUCT',
        entityId: product.id,
        metadata: {
          name: data.name,
          status: targetStatus,
        },
      });

      // PHASE G: Log success and record metrics
      const { logInfo } = await import('@/lib/structured-logger');
      const { recordRequest } = await import('@/lib/basic-monitoring');
      
      const duration = Date.now() - startTime;
      logInfo('Product saved successfully', {
        productId: product.id,
        status: targetStatus,
        duration,
      });
      recordRequest('POST', '/api/admin/products/save', 200, duration);

      return NextResponse.json({
        product,
        message: `Product created with status: ${targetStatus}`,
        ...(finalSlug !== data.slug && { slugModified: true, finalSlug }),
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        issues: error.issues 
      }, { status: 400 });
    }
      // PHASE G: Log error with structured logger
      const { logError } = await import('@/lib/structured-logger');
      const { recordRequest } = await import('@/lib/basic-monitoring');
      
      const duration = Date.now() - startTime;
      logError('Product save failed', error, {
        endpoint: '/api/admin/products/save',
        method: 'POST',
      });
      recordRequest('POST', '/api/admin/products/save', 500, duration);
      
      return NextResponse.json({ 
        error: error.message || 'Internal server error' 
      }, { status: 500 });
  }
}

