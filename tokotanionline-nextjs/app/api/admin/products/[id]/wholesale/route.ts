/**
 * STEP 19E-1: Wholesale Pricing API
 * 
 * Purpose: Manage wholesale/reseller pricing tiers
 * - GET: List wholesale prices (sorted by minQty ASC)
 * - POST: Add/update tier
 * - DELETE: Remove tier
 * - Role: super_admin / admin
 * - minQty > 1, price > 0
 * - No duplicate minQty per product
 * - Sorting ASC enforced in backend
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const wholesaleTierSchema = z.object({
  minQty: z.number().int().min(2, 'minQty harus lebih besar dari 1'),
  price: z.number().positive('price harus lebih besar dari 0'),
});

// GET /api/admin/products/[id]/wholesale - List wholesale prices
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get wholesale prices sorted by minQty ASC (enforced in backend)
    const wholesalePrices = await prisma.productWholesalePrice.findMany({
      where: { productId: params.id },
      orderBy: { minQty: 'asc' }, // ASC enforced
    });

    return NextResponse.json({
      productId: params.id,
      productName: product.name,
      wholesalePrices,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// POST /api/admin/products/[id]/wholesale - Add or update tier
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = wholesaleTierSchema.parse(body);

    // Check for duplicate minQty (prevent duplicate)
    const existingTier = await prisma.productWholesalePrice.findFirst({
      where: {
        productId: params.id,
        minQty: data.minQty,
      },
    });

    if (existingTier) {
      // Update existing tier
      const updatedTier = await prisma.productWholesalePrice.update({
        where: { id: existingTier.id },
        data: {
          price: data.price,
        },
      });

      return NextResponse.json({
        tier: updatedTier,
        message: 'Wholesale tier updated',
        action: 'updated',
      });
    } else {
      // Create new tier
      const newTier = await prisma.productWholesalePrice.create({
        data: {
          productId: params.id,
          minQty: data.minQty,
          price: data.price,
        },
      });

      return NextResponse.json({
        tier: newTier,
        message: 'Wholesale tier created',
        action: 'created',
      });
    }
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

// DELETE /api/admin/products/[id]/wholesale - Remove tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get tierId from query params or body
    const { searchParams } = new URL(request.url);
    const tierId = searchParams.get('tierId');

    if (!tierId) {
      return NextResponse.json({ 
        error: 'tierId required' 
      }, { status: 400 });
    }

    // Verify tier exists and belongs to this product
    const tier = await prisma.productWholesalePrice.findFirst({
      where: {
        id: tierId,
        productId: params.id,
      },
    });

    if (!tier) {
      return NextResponse.json({ 
        error: 'Wholesale tier not found' 
      }, { status: 404 });
    }

    // Delete tier
    await prisma.productWholesalePrice.delete({
      where: { id: tierId },
    });

    return NextResponse.json({
      message: 'Wholesale tier deleted',
      deletedTier: tier,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

