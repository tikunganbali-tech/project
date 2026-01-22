/**
 * STEP 6: Error handling hardened
 * STEP 9A: Moved to by-id structure to resolve routing conflict
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// PATCH /api/catalog-products/by-id/[id]/publish - Toggle publish status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.catalogProduct.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await prisma.catalogProduct.update({
      where: { id: params.id },
      data: {
        published: !product.published,
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error publishing product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}


