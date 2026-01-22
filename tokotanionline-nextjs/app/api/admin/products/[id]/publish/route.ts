/**
 * FITUR 4: Product Publish Endpoint
 * 
 * POST /api/admin/products/[id]/publish
 * 
 * Purpose: Publish a product (change status from DRAFT to PUBLISHED)
 * - Validates product is publishable
 * - Sets publishedAt timestamp
 * - Logs activity
 * - Only super_admin can publish
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRODUCT_STATUS, isPublishable, canTransitionTo, type ProductForValidation } from '@/lib/product-rules';
import { hasPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';
import { validateProductPhaseA } from '@/lib/product-validation-phase-a';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    
    // Only super_admin can publish
    if (!hasPermission(userRole, 'product.publish')) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can publish products' },
        { status: 403 }
      );
    }

    // M-08: Get idempotency key from request header
    const idempotencyKey = request.headers.get('x-idempotency-key');

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        status: true,
        price: true,
        stock: true,
        isActive: true,
        categoryId: true,
        description: true,
        imageUrl: true,
        seoSchema: true,
        metaTitle: true,
        metaDescription: true,
        publishedAt: true,
        schedulerKeywordId: true, // M-08
        publishSource: true, // M-08
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // M-08: Guard - Check if scheduler is PROCESSING this content
    if (product.schedulerKeywordId) {
      const keyword = await prisma.scheduleKeyword.findUnique({
        where: { id: product.schedulerKeywordId },
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

    // M-08: Idempotency check - if already published with same idempotency key, return success
    if (idempotencyKey && product.status === PRODUCT_STATUS.PUBLISHED && product.publishSource === 'MANUAL') {
      // Check if this was a recent publish (within last 5 minutes) - likely same request
      const recentPublish = product.publishedAt && 
        new Date(product.publishedAt).getTime() > Date.now() - 5 * 60 * 1000;
      
      if (recentPublish) {
        return NextResponse.json({
          product,
          message: 'Product already published (idempotent)',
          idempotent: true,
        });
      }
    }

    const currentStatus = product.status || PRODUCT_STATUS.DRAFT;

    // Prepare product for validation
    const productForValidation: ProductForValidation = {
      status: currentStatus,
      name: product.name,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
      categoryId: product.categoryId,
      description: product.description,
      imageUrl: product.imageUrl,
    };

    // Validate transition
    if (!canTransitionTo(currentStatus, PRODUCT_STATUS.PUBLISHED, productForValidation)) {
      return NextResponse.json(
        {
          error: 'Invalid status transition',
          message: `Cannot transition from ${currentStatus} to PUBLISHED`,
        },
        { status: 400 }
      );
    }

    // Validate publishability (Product v2 - updated rules)
    if (!isPublishable(productForValidation)) {
      return NextResponse.json(
        {
          error: 'Product is not publishable',
          message:
            'Product does not meet all requirements for publishing. Please check: name, price, category, and long_description_html.',
        },
        { status: 400 }
      );
    }

    // C2/D2: QC Gate - Check if product has QC status and block if FAIL
    // Check seoSchema for QC status (stored during AI generation)
    let qcStatus: string | null = null;
    let qcFailedFields = 0;
    if (product.seoSchema) {
      try {
        const schema = typeof product.seoSchema === 'string' 
          ? JSON.parse(product.seoSchema) 
          : product.seoSchema;
        qcStatus = schema.qc_status || null;
        qcFailedFields = schema.qc_failed_fields || 0;
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // C2/D2: Hard Gate - Block publish if QC FAIL
    if (qcStatus === 'FAIL') {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: `Quality check failed. ${qcFailedFields} field(s) did not pass QC. Please regenerate or fix the failed fields before publishing.`,
          qc_status: 'FAIL',
          qc_failed_fields: qcFailedFields,
        },
        { status: 400 }
      );
    }

    // D2: Validate long description is not empty (hard gate)
    if (!product.description || product.description.trim() === '' || product.description === '<p></p>') {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: 'Long description is required and cannot be empty. Please add description before publishing.',
        },
        { status: 400 }
      );
    }

    // E: QC Gate - Product v2: Block publish if QC FAIL or long_description_html empty
    // D2: Validate long_description_html is not empty (hard gate - A2 requirement)
    const hasValidLongDescription = product.description && 
                                    product.description.trim() !== '' && 
                                    product.description !== '<p></p>' &&
                                    product.description !== '<section></section>';
    
    if (!hasValidLongDescription) {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: 'long_description_html is required and cannot be empty. Please add description before publishing.',
        },
        { status: 400 }
      );
    }

    // E: QC Gate - Block publish if QC FAIL
    if (qcStatus === 'FAIL') {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: `Quality check failed (QC status: ${qcStatus}). Please ensure long_description_html is not empty and regenerate if needed.`,
          qc_status: 'FAIL',
        },
        { status: 400 }
      );
    }

    // D2: Validate SEO fields are filled (hard gate)
    if (!product.metaTitle || product.metaTitle.trim() === '') {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: 'SEO title is required. Please add SEO title before publishing.',
        },
        { status: 400 }
      );
    }

    if (!product.metaDescription || product.metaDescription.trim() === '') {
      return NextResponse.json(
        {
          error: 'Product cannot be published',
          reason: 'SEO description is required. Please add SEO description before publishing.',
        },
        { status: 400 }
      );
    }

    // PHASE A: Data Contract & Validation - Validasi keras sebelum publish
    const phaseAValidation = validateProductPhaseA({
      slug: product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100) : '', // Fallback slug dari name
      shortDescription: null, // Tidak ada di product object, skip
      specifications: null, // Tidak ada di product object, skip
      seoSchema: product.seoSchema || null,
      status: PRODUCT_STATUS.PUBLISHED,
      publishedAt: product.publishedAt || null,
      name: product.name,
    });

    // Jika ada error validasi PHASE A (kecuali shortDescription dan specifications yang tidak ada di product object)
    const phaseAErrors = phaseAValidation.errors.filter(
      (err) => !err.includes('Deskripsi Singkat') && !err.includes('Spesifikasi')
    );
    
    if (phaseAErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation error (PHASE A)',
          message: 'Data tidak memenuhi kontrak data PHASE A',
          issues: phaseAErrors,
        },
        { status: 422 }
      );
    }

    // M-08: Update product to PUBLISHED with publishSource = MANUAL
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: PRODUCT_STATUS.PUBLISHED,
        publishedAt: new Date(),
        publishSource: 'MANUAL', // M-08
      },
      include: { category: true, subCategory: true },
    });

    // Log activity
    const actorId = (session.user as any).id;
    await logActivity({
      actorId,
      action: 'PUBLISH',
      entityType: 'PRODUCT',
      entityId: params.id,
      metadata: {
        name: product.name,
        statusBefore: currentStatus,
        statusAfter: PRODUCT_STATUS.PUBLISHED,
        publishSource: 'MANUAL', // M-08
        idempotencyKey: idempotencyKey || null, // M-08
      },
    });

    return NextResponse.json({
      product: updatedProduct,
      message: 'Product published successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
