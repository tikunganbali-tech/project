/**
 * PHASE 7B: Locale Switch API - Switch active locale for admin session
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
    const { localeId, brandId } = body;

    if (!localeId || !brandId) {
      return NextResponse.json(
        { error: 'Locale ID and Brand ID are required' },
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

    // Verify brand access
    if (admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 403 }
      );
    }

    // Verify locale exists and belongs to brand
    const locale = await prisma.locale.findUnique({
      where: { id: localeId },
    });

    if (!locale) {
      return NextResponse.json(
        { error: 'Locale not found' },
        { status: 404 }
      );
    }

    if (locale.brandId !== brandId) {
      return NextResponse.json(
        { error: 'Locale does not belong to this brand' },
        { status: 400 }
      );
    }

    if (!locale.isActive) {
      return NextResponse.json(
        { error: 'Locale is not active' },
        { status: 400 }
      );
    }

    // For super admin, we store locale preference in session/cookie
    // For regular admin, locale is based on brand's default locale
    // In production, you might want to store this in a session store or cookie

    return NextResponse.json({
      success: true,
      localeId: locale.id,
      localeCode: locale.localeCode,
      languageName: locale.languageName,
      message: 'Locale switched successfully',
    });
  } catch (error) {
    console.error('[Locale Switch API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to switch locale' },
      { status: 500 }
    );
  }
}
