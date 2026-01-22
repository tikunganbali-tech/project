/**
 * PHASE 7C: Aggregated Insights API (READ-ONLY)
 * 
 * Provides cross-brand and cross-locale insights without exposing raw content.
 * No edit, no publish, no rewrite - informational only.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  preventCrossBrandContentAccess,
  validateInsightResponse,
  preventAutoRewrite,
  preventAutoPublish,
  validateNormalizedMetrics,
  validateAnonymizedIdentifiers
} from '@/lib/insight-guardrails';

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
    const scope = searchParams.get('scope') || 'global';
    const brandId = searchParams.get('brandId') || '';
    const localeId = searchParams.get('localeId') || '';
    const pageType = searchParams.get('pageType') || '';

    // PHASE 7C GUARDRAIL: Validate scope
    if (!['brand', 'locale', 'brand_locale', 'global'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be: brand, locale, brand_locale, or global' },
        { status: 400 }
      );
    }

    // PHASE 7C GUARDRAIL: Validate parameters
    if (scope === 'brand' && !brandId) {
      return NextResponse.json(
        { error: 'brandId is required for scope=brand' },
        { status: 400 }
      );
    }

    if (scope === 'locale' && !localeId) {
      return NextResponse.json(
        { error: 'localeId is required for scope=locale' },
        { status: 400 }
      );
    }

    if (scope === 'brand_locale' && (!brandId || !localeId)) {
      return NextResponse.json(
        { error: 'brandId and localeId are required for scope=brand_locale' },
        { status: 400 }
      );
    }

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

    // PHASE 7C GUARDRAIL: Check brand access (unless super_admin or global scope)
    if (scope !== 'global' && admin.role !== 'super_admin') {
      if (scope === 'brand' || scope === 'brand_locale') {
        if (admin.brandId !== brandId) {
          return NextResponse.json(
            { error: 'You do not have access to this brand' },
            { status: 403 }
          );
        }
      }
    }

    // PHASE 7C: Aggregate insights from database
    // This aggregates from SEO reports, SERP signals, and user signals
    // WITHOUT accessing raw content

    const insight = await aggregateInsights(scope, brandId, localeId, pageType);

    // PHASE 7C GUARDRAILS: Validate insight response
    try {
      validateInsightResponse(insight);
      validateNormalizedMetrics(insight);
      validateAnonymizedIdentifiers(insight);

      preventAutoPublish(insight);
    } catch (guardrailError: any) {
      console.error('[Insights API] Guardrail violation:', guardrailError);
      return NextResponse.json(
        { error: guardrailError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scope,
      brandId: brandId || null,
      localeId: localeId || null,
      pageType: pageType || null,
      insight,
      readOnly: true, // PHASE 7C: Explicit read-only flag
      warning: 'This is a read-only insight. No content access, no edit, no publish.',
    }, {
      headers: {
        'X-Read-Only': 'true', // PHASE 7C: Header indicating read-only
      },
    });
  } catch (error) {
    console.error('[Insights API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate insights' },
      { status: 500 }
    );
  }
}

/**
 * Aggregate insights from database
 * PHASE 7C: Only metrics, no raw content
 */
async function aggregateInsights(
  scope: string,
  brandId: string,
  localeId: string,
  pageType: string
) {
  // Build where clause based on scope
  const where: any = {};

  if (scope === 'brand' || scope === 'brand_locale') {
    where.brandId = brandId;
  }

  if (scope === 'locale' || scope === 'brand_locale') {
    where.localeId = localeId;
  }

  // PHASE 7C: Aggregate from SeoMetadata (which has brandId and localeId)
  // Note: In production, you would also aggregate from:
  // - SEO QC reports (stored in file system)
  // - SERP signal history (stored in file system)
  // - User signal aggregated (stored in file system)
  // For now, we'll aggregate from SeoMetadata as a starting point

  const seoMetadata = await prisma.seoMetadata.findMany({
    where,
    include: {
      brand: true,
      locale: true,
    },
  });

  // Calculate aggregates
  const totalPages = seoMetadata.length;
  if (totalPages === 0) {
    return {
      totalPages: 0,
      avgSeoScore: 0,
      avgPosition: 0,
      avgCtr: 0,
      totalImpressions: 0,
      avgDwellTime: 0,
      avgBounceRate: 0,
      avgScrollDepth: 0,
      seoScoreTrend: 'stable',
      positionTrend: 'stable',
      ctrTrend: 'stable',
      scoreDistribution: {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
      },
      positionDistribution: {
        '1-10': 0,
        '11-20': 0,
        '21-50': 0,
        '51-100': 0,
        '100+': 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // PHASE 7C: Calculate aggregates from SeoMetadata
  // Note: In production, would also aggregate from:
  // - SEO QC reports (from Go engine storage)
  // - SERP signal history (from Go engine storage)
  // - User signal aggregated (from Go engine storage)
  
  // For now, return structure with basic counts
  // Real aggregation would come from Go engine's InsightAggregator
  
  // Calculate score distribution (placeholder - would need actual SEO scores)
  const scoreDistribution = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0,
  };
  
  // Calculate position distribution (placeholder - would need actual positions)
  const positionDistribution = {
    '1-10': 0,
    '11-20': 0,
    '21-50': 0,
    '51-100': 0,
    '100+': 0,
  };
  
  return {
    totalPages,
    avgSeoScore: 75, // Placeholder - would calculate from actual SEO reports
    avgPosition: 25, // Placeholder - would calculate from SERP signals
    avgCtr: 0.05, // Placeholder - would calculate from SERP signals
    totalImpressions: 0, // Placeholder - would calculate from SERP signals
    avgDwellTime: 120, // Placeholder - would calculate from user signals
    avgBounceRate: 0.4, // Placeholder - would calculate from user signals
    avgScrollDepth: 0.6, // Placeholder - would calculate from user signals
    seoScoreTrend: 'stable', // Placeholder - would calculate from trends
    positionTrend: 'stable', // Placeholder
    ctrTrend: 'stable', // Placeholder
    scoreDistribution,
    positionDistribution,
    generatedAt: new Date().toISOString(),
  };
}
