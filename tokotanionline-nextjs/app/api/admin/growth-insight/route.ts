/**
 * PHASE 8C.5: Read-Only Growth Insight API
 * 
 * GET-only endpoint with filters (brand, locale, channel, timeframe)
 * ❌ Tidak ada endpoint mutasi
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const brandId = searchParams.get('brandId') || '';
    const localeId = searchParams.get('localeId') || '';
    const channel = searchParams.get('channel') || ''; // SEO | ADS | ANALYTICS
    const pageType = searchParams.get('pageType') || '';
    const timeframe = searchParams.get('timeframe') || '30'; // days

    // Get admin for brand access check
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // PHASE 8C: Guardrail - brand access check
    if (brandId && admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 403 }
      );
    }

    // TODO: In production, this would call the Go engine to generate growth insights
    // For now, return placeholder structure
    
    // In production, this would:
    // 1. Call SignalCollector to collect signals
    // 2. Call SignalNormalizer to normalize signals
    // 3. Call InsightEngine to generate insights
    // 4. Call InsightCategorizer to categorize
    // 5. Return GrowthInsightReport with categories

    return NextResponse.json({
      insights: [], // Placeholder - would contain actual growth insights
      categories: [], // Placeholder - would contain categorized insights
      readOnly: true, // PHASE 8C.5: Always read-only
      warning: 'This is a read-only insight API. No mutations, no auto-edit, no auto-publish.',
    }, {
      headers: {
        'X-Read-Only': 'true', // PHASE 8C.5: Header indicating read-only
        'Allow': 'GET', // PHASE 8C.5: Only GET allowed
      },
    });
  } catch (error) {
    console.error('[Growth Insight API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load growth insights' },
      { status: 500 }
    );
  }
}

// PHASE 8C.5: No POST, PUT, DELETE endpoints
// All mutations are explicitly disabled
