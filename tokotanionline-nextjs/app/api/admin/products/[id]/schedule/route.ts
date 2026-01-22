/**
 * PHASE S: Schedule Product API
 * 
 * POST /api/admin/products/[id]/schedule - Schedule product untuk publish di waktu tertentu
 * 
 * Rules (PRINSIP KERAS):
 * - TIDAK ADA AUTO-PUBLISH
 * - Scheduler hanya menyiapkan waktu & status
 * - Publish tetap lewat approval manusia
 * - Status: DRAFT → SCHEDULED
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(), // ISO datetime string
});

// POST /api/admin/products/[id]/schedule
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
    const body = await request.json();
    const data = scheduleSchema.parse(body);

    // Validate scheduledAt is in the future
    const scheduledDate = new Date(data.scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate status transition: Only DRAFT can be scheduled (or null for backward compatibility)
    if (product.status && product.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Invalid status transition',
          reason: `Product status is ${product.status}, can only schedule from DRAFT`,
        },
        { status: 400 }
      );
    }

    // Update: status → SCHEDULED, scheduledAt → provided time
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
        // approvedBy dan approvedAt tetap null (belum disetujui)
      },
    });

    // PHASE S: Audit log - product_scheduled
    try {
      await prisma.eventLog.create({
        data: {
          event: 'product_scheduled',
          url: `/admin/products/${params.id}`,
          meta: {
            productId: params.id,
            actorId,
            statusBefore: product.status || 'DRAFT',
            statusAfter: 'SCHEDULED',
            scheduledAt: scheduledDate.toISOString(),
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('Failed to log schedule event:', error);
    }

    return NextResponse.json({
      product: updated,
      message: 'Product scheduled successfully. It will be marked as READY_TO_PUBLISH when the time arrives, but requires manual approval to publish.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error scheduling product:', error);
    return NextResponse.json(
      { error: 'Failed to schedule product' },
      { status: 500 }
    );
  }
}
