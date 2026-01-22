/**
 * PHASE S: Cancel Schedule Product API
 * 
 * POST /api/admin/products/[id]/cancel-schedule - Cancel scheduled product
 * 
 * Rules (PRINSIP KERAS):
 * - Hanya bisa cancel dari status SCHEDULED atau READY_TO_PUBLISH
 * - Status: SCHEDULED/READY_TO_PUBLISH → CANCELLED
 * - Clear scheduledAt, approvedBy, approvedAt
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// POST /api/admin/products/[id]/cancel-schedule
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
    if (!hasPermission(userRole, 'product.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorId = (session.user as any).id;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        name: true,
        scheduledAt: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate status: Can only cancel from SCHEDULED or READY_TO_PUBLISH
    if (product.status !== 'SCHEDULED' && product.status !== 'READY_TO_PUBLISH') {
      return NextResponse.json(
        {
          error: 'Invalid status for cancel',
          reason: `Product status is ${product.status || 'null'}, can only cancel from SCHEDULED or READY_TO_PUBLISH`,
        },
        { status: 400 }
      );
    }

    const statusBefore = product.status || 'DRAFT';

    // Update: status → CANCELLED, clear scheduling fields
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        scheduledAt: null,
        approvedBy: null,
        approvedAt: null,
      },
    });

    // PHASE S: Audit log - product_schedule_cancelled
    try {
      await prisma.eventLog.create({
        data: {
          event: 'product_schedule_cancelled',
          url: `/admin/products/${params.id}`,
          meta: {
            productId: params.id,
            actorId,
            statusBefore,
            statusAfter: 'CANCELLED',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log cancel event:', error);
    }

    return NextResponse.json({
      product: updated,
      message: 'Schedule cancelled successfully. Product status changed to CANCELLED.',
    });
  } catch (error: any) {
    console.error('Error cancelling schedule:', error);
    return NextResponse.json(
      { error: 'Failed to cancel schedule' },
      { status: 500 }
    );
  }
}
