/**
 * STEP 19C-2B: Product Status Change API (Controlled)
 * 
 * Purpose: Change product status with strict validation
 * - Only super_admin can change status
 * - Validates transition using canTransitionTo
 * - If transitioning to PUBLISHED → must pass isPublishable
 * - No engine triggers
 * - No SEO triggers
 * - Only updates DB
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { 
  canTransitionTo, 
  isPublishable, 
  PRODUCT_STATUS, 
  type ProductStatus,
  type ProductForValidation 
} from '@/lib/product-rules';
import { logActivity } from '@/lib/activity-logger';

const statusChangeSchema = z.object({
  nextStatus: z.enum([PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.ARCHIVED], {
    message: 'nextStatus must be PUBLISHED or ARCHIVED',
  }),
});

// POST /api/admin/products/[id]/status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Super admin access required' 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { nextStatus } = statusChangeSchema.parse(body);

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Prepare product for validation
    const productForValidation: ProductForValidation = {
      status: product.status,
      name: product.name,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
      categoryId: product.categoryId,
      description: product.description,
      imageUrl: product.imageUrl,
    };

    // Validate transition using product-rules
    const currentStatus = product.status || null;
    const canTransition = canTransitionTo(
      currentStatus,
      nextStatus as ProductStatus,
      productForValidation
    );

    if (!canTransition) {
      return NextResponse.json({ 
        error: 'Invalid status transition',
        currentStatus,
        nextStatus,
        message: `Cannot transition from ${currentStatus || 'null'} to ${nextStatus}`,
      }, { status: 400 });
    }

    // If transitioning to PUBLISHED, must pass isPublishable check
    if (nextStatus === PRODUCT_STATUS.PUBLISHED) {
      const publishable = isPublishable(productForValidation);
      if (!publishable) {
        return NextResponse.json({ 
          error: 'Product is not publishable',
          message: 'Product does not meet all requirements for publishing. Please check: name, price, category, description, and image.',
          currentStatus,
        }, { status: 400 });
      }
    }

    // Update product status (no engine triggers, no SEO triggers)
    // Only update status field - no other fields modified
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        ...(nextStatus === PRODUCT_STATUS.PUBLISHED && { publishedAt: new Date() }),
      },
      include: { category: true },
    });

    // Activity log
    const actorId = (session.user as any).id;
    await logActivity({
      actorId,
      action: nextStatus === PRODUCT_STATUS.PUBLISHED ? 'PUBLISH' : 'UPDATE',
      entityType: 'PRODUCT',
      entityId: params.id,
      metadata: {
        name: product.name,
        statusBefore: currentStatus,
        statusAfter: nextStatus,
      },
    });

    return NextResponse.json({ 
      product: updatedProduct,
      message: `Product status changed to ${nextStatus}`,
      previousStatus: currentStatus,
      newStatus: nextStatus,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        issues: error.issues 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

