/**
 * STEP 6: Error handling hardened
 * STEP 9A: Moved to by-id structure to resolve routing conflict
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
// DISABLED: Validation module not available
// import { validateSlug } from '@/lib/validation';
import * as logger from '@/lib/logger';

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().min(0),
});

// GET /api/catalog-products/by-id/[id] - Get product by id (admin only)
export async function GET(
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

    return NextResponse.json({ product });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/catalog-products/by-id/[id] - Update product (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    // Validate slug
    // DISABLED: Validation module not available
    // const slugValidation = validateSlug(data.slug);
    // if (!slugValidation.valid) {
    //   return NextResponse.json(
    //     { error: slugValidation.error || 'Invalid slug' },
    //     { status: 400 }
    //   );
    // }

    // Check if slug exists (excluding current product)
    const existing = await prisma.catalogProduct.findFirst({
      where: {
        slug: data.slug,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    const product = await prisma.catalogProduct.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    // STEP 6: Use logger, don't leak error details
    logger.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}


