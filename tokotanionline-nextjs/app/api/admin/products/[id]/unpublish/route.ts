/**
 * FITUR 4: Product Unpublish Endpoint
 * 
 * POST /api/admin/products/[id]/unpublish
 * 
 * Purpose: Unpublish a product (change status from PUBLISHED to DRAFT)
 * - Sets status to DRAFT
 * - Logs activity
 * - Only super_admin can unpublish
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRODUCT_STATUS, canTransitionTo } from '@/lib/product-rules';
import { hasPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';

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
    
    // Only super_admin can unpublish
    if (!hasPermission(userRole, 'product.publish')) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can unpublish products' },
        { status: 403 }
      );
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentStatus = product.status || PRODUCT_STATUS.DRAFT;

    // Validate transition (PUBLISHED → DRAFT is always allowed)
    if (!canTransitionTo(currentStatus, PRODUCT_STATUS.DRAFT)) {
      return NextResponse.json(
        {
          error: 'Invalid status transition',
          message: `Cannot transition from ${currentStatus} to DRAFT`,
        },
        { status: 400 }
      );
    }

    // Update product to DRAFT
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: PRODUCT_STATUS.DRAFT,
      },
      include: { category: true, subCategory: true },
    });

    // Log activity
    const actorId = (session.user as any).id;
    await logActivity({
      actorId,
      action: 'UNPUBLISH',
      entityType: 'PRODUCT',
      entityId: params.id,
      metadata: {
        name: product.name,
        statusBefore: currentStatus,
        statusAfter: PRODUCT_STATUS.DRAFT,
      },
    });

    return NextResponse.json({
      product: updatedProduct,
      message: 'Product unpublished successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
