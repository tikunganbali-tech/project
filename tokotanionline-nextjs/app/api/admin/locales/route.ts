/**
 * PHASE 7B: Locale API - List locales for a brand
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

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
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

    // Verify brand access
    if (admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 403 }
      );
    }

    // Get locales for brand
    const locales = await prisma.locale.findMany({
      where: {
        brandId: brandId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' }, // Default first
        { languageName: 'asc' },
      ],
    });

    // Get current locale from session or default
    const defaultLocale = locales.find(l => l.isDefault) || locales[0];
    const currentLocaleId = defaultLocale?.id || null;

    return NextResponse.json({
      locales,
      currentLocaleId,
    });
  } catch (error) {
    console.error('[Locale API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load locales' },
      { status: 500 }
    );
  }
}
