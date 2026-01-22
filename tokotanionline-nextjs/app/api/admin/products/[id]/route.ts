/**
 * STEP 19F-2: Admin Product Read API (Full Visibility)
 * 
 * Purpose: Read-only API for admin with full product data
 * - Role: admin / super_admin
 * - Can see: status, wholesalePrices raw, attributes
 * - Read-only (no write operations)
 * - No engine triggers
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/products/[id] - Admin read (full visibility)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: admin or super_admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch product with all relations (full visibility for admin)
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        subCategory: true,
        wholesalePrices: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Build full product response (admin can see everything)
    const fullProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : null,
      features: product.features ? JSON.parse(product.features) : null,
      pestTargets: product.pestTargets ? JSON.parse(product.pestTargets) : null,
      activeIngredients: product.activeIngredients ? JSON.parse(product.activeIngredients) : null,
      packagingVariants: product.packagingVariants ? JSON.parse(product.packagingVariants) : null,
      attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : null,
      // Include all sensitive data for admin:
      status: product.status, // Internal status visible
      wholesalePrices: product.wholesalePrices, // Raw wholesale data visible
      isActive: product.isActive, // Internal flag visible
      salesWeight: product.salesWeight, // Internal metric visible
    };

    return NextResponse.json({ product: fullProduct });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

