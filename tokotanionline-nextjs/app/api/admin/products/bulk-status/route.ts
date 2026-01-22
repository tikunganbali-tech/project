/**
 * STEP 3.1.1: Bulk Product Status Update API
 * 
 * Purpose: Bulk update product status (publish/unpublish)
 * - Manual trigger only
 * - Only super_admin can bulk publish
 * - Respects product-rules validation
 * - Updates status only, no side effects
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
  type ProductForValidation,
} from '@/lib/product-rules';

const bulkStatusSchema = z.object({
  productIds: z.array(z.string()).min(1, 'At least one product ID required'),
  nextStatus: z.enum([PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.DRAFT], {
    message: 'nextStatus must be PUBLISHED or DRAFT',
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // Permission check: super_admin only for bulk publish
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Only super_admin can perform bulk status updates',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { productIds, nextStatus } = bulkStatusSchema.parse(body);

    // Fetch all products
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        category: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        {
          error: 'Some products not found',
          requested: productIds.length,
          found: products.length,
        },
        { status: 400 }
      );
    }

    // Validate each product transition
    const results: Array<{
      productId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const product of products) {
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

      // Check if transition is allowed
      const currentStatus = product.status || null;
      const canTransition = canTransitionTo(
        currentStatus,
        nextStatus as ProductStatus,
        productForValidation
      );

      if (!canTransition) {
        results.push({
          productId: product.id,
          success: false,
          error: `Cannot transition from ${currentStatus || 'null'} to ${nextStatus}`,
        });
        continue;
      }

      // If publishing, check publishability
      if (nextStatus === PRODUCT_STATUS.PUBLISHED) {
        const publishable = isPublishable(productForValidation);
        if (!publishable) {
          results.push({
            productId: product.id,
            success: false,
            error: 'Product does not meet publishability requirements',
          });
          continue;
        }
      }

      // Perform update
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            status: nextStatus,
          },
        });
        results.push({
          productId: product.id,
          success: true,
        });
      } catch (error: any) {
        results.push({
          productId: product.id,
          success: false,
          error: error.message || 'Update failed',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Bulk status update completed: ${successCount} succeeded, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
