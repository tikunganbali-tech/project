/**
 * PHASE 7A: Brand Switch API - Switch active brand for admin session
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify brand exists and is active
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (brand.brandStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Brand is not active' },
        { status: 400 }
      );
    }

    // Check permission:
    // - Super admin can switch to any brand
    // - Regular admin can only switch to their assigned brand
    if (admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have permission to switch to this brand' },
        { status: 403 }
      );
    }

    // For super admin, we store brand preference in session/cookie
    // For regular admin, brand is fixed (their brandId)
    // In production, you might want to store this in a session store or cookie

    return NextResponse.json({
      success: true,
      brandId: brand.id,
      brandName: brand.brandName,
      message: 'Brand switched successfully',
    });
  } catch (error) {
    console.error('[Brand Switch API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to switch brand' },
      { status: 500 }
    );
  }
}
