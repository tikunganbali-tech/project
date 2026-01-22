/**
 * PHASE S: Approve Product for Publishing API
 * 
 * POST /api/admin/products/[id]/approve - Approve product untuk publish
 * 
 * Rules (PRINSIP KERAS):
 * - MANUSIA = PEMUTUS AKHIR
 * - Approve hanya bisa dari status SCHEDULED atau READY_TO_PUBLISH
 * - Status: SCHEDULED/READY_TO_PUBLISH → READY_TO_PUBLISH (mark as ready)
 * - Set approvedBy dan approvedAt
 * - Publish TETAP harus manual action terpisah (tidak auto)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-logger';

// POST /api/admin/products/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth & permission check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    // Approve requires product.manage permission (admin level)
    if (!hasPermission(userRole, 'product.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const approverId = (session.user as any).id;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        name: true,
        scheduledAt: true,
        description: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate status: Can only approve from SCHEDULED or READY_TO_PUBLISH
    if (product.status !== 'SCHEDULED' && product.status !== 'READY_TO_PUBLISH') {
      return NextResponse.json(
        {
          error: 'Invalid status for approval',
          reason: `Product status is ${product.status || 'null'}, can only approve from SCHEDULED or READY_TO_PUBLISH`,
        },
        { status: 400 }
      );
    }

    // Validate description is not empty
    if (!product.description || product.description.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Product cannot be approved',
          reason: 'Description is empty',
        },
        { status: 400 }
      );
    }

    const statusBefore = product.status || 'DRAFT';

    // Update: status → READY_TO_PUBLISH, approvedBy → current admin, approvedAt → now
    // PENTING: Tidak publish otomatis, hanya mark sebagai ready
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: 'READY_TO_PUBLISH',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // PHASE S: Audit log - product_approved
    try {
      await prisma.eventLog.create({
        data: {
          event: 'product_approved',
          url: `/admin/products/${params.id}`,
          meta: {
            productId: params.id,
            approverId,
            statusBefore,
            statusAfter: 'READY_TO_PUBLISH',
            scheduledAt: product.scheduledAt?.toISOString() || null,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log approval event:', error);
    }

    // Activity log
    await logActivity({
      actorId: approverId,
      action: 'APPROVE',
      entityType: 'PRODUCT',
      entityId: params.id,
      metadata: {
        name: product.name,
        statusBefore,
        statusAfter: 'READY_TO_PUBLISH',
      },
    });

    return NextResponse.json({
      product: updated,
      message: 'Product approved and ready to publish. Use the status endpoint to actually publish it.',
    });
  } catch (error: any) {
    console.error('Error approving product:', error);
    return NextResponse.json(
      { error: 'Failed to approve product' },
      { status: 500 }
    );
  }
}
