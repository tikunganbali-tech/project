/**
 * PHASE 7A: Brand API - List brands and get current brand
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get admin with brand assignment
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
      include: { brand: true },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Super admin (no brandId) can see all brands
    // Regular admin can only see their assigned brand
    let brands;
    if (!admin.brandId || admin.role === 'super_admin') {
      // Super admin or admin without brand assignment - see all active brands
      brands = await prisma.brand.findMany({
        where: { brandStatus: 'ACTIVE' },
        orderBy: { brandName: 'asc' },
      });
    } else {
      // Regular admin - only see their assigned brand
      brands = await prisma.brand.findMany({
        where: {
          id: admin.brandId,
          brandStatus: 'ACTIVE',
        },
      });
    }

    // Get current brand from session or admin's brand assignment
    const currentBrandId = admin.brandId || brands[0]?.id || null;

    return NextResponse.json({
      brands,
      currentBrandId,
    });
  } catch (error) {
    console.error('[Brand API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load brands' },
      { status: 500 }
    );
  }
}
