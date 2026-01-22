/**
 * PHASE 8A.6: Ads Intelligence API (READ-ONLY)
 * 
 * Provides ads performance data, creative versions, and strategy reports.
 * NO auto-publish, NO auto-edit, NO auto-rewrite.
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
    const platform = searchParams.get('platform') || '';
    const period = searchParams.get('period') || '30'; // days

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

    // PHASE 8A: Guardrail - brand access check
    if (brandId && admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = {};
    if (brandId) {
      where.brandId = brandId;
    }
    if (localeId) {
      where.localeId = localeId;
    }
    if (platform) {
      where.platform = platform;
    }

    // Get campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where,
      include: {
        creatives: {
          orderBy: { version: 'desc' },
          take: 5, // Latest 5 versions
        },
        _count: {
          select: {
            creatives: true,
            performances: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get performance data (last N days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const performances = await prisma.adPerformance.findMany({
      where: {
        ...where,
        date: {
          gte: daysAgo,
        },
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    // Calculate summary metrics
    const summary = {
      totalCampaigns: campaigns.length,
      totalCreatives: campaigns.reduce((sum, c) => sum + c._count.creatives, 0),
      totalImpressions: performances.reduce((sum, p) => sum + p.impressions, 0),
      totalClicks: performances.reduce((sum, p) => sum + p.clicks, 0),
      avgCTR: performances.length > 0
        ? performances.reduce((sum, p) => sum + p.ctr, 0) / performances.length
        : 0,
      totalConversions: performances.reduce((sum, p) => sum + p.conversions, 0),
      totalSpend: performances.reduce((sum, p) => sum + (p.spend || 0), 0),
    };

    // Get strategy reports (latest)
    const strategyReports = await prisma.adStrategyReport.findMany({
      where: brandId ? { brandId } : {},
      orderBy: { generatedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      campaigns: campaigns.map(c => ({
        id: c.id,
        campaignName: c.campaignName,
        platform: c.platform,
        objective: c.objective,
        status: c.status,
        brandId: c.brandId,
        localeId: c.localeId,
        createdAt: c.createdAt.toISOString(),
        creativeCount: c._count.creatives,
        performanceCount: c._count.performances,
        latestCreatives: c.creatives.map(cr => ({
          id: cr.id,
          version: cr.version,
          headline: cr.headline,
          primaryText: cr.primaryText,
          ctaText: cr.ctaText,
          status: cr.status,
          generatedAt: cr.generatedAt.toISOString(),
        })),
      })),
      summary,
      strategyReports: strategyReports.map(r => ({
        id: r.id,
        brandId: r.brandId,
        localeId: r.localeId,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        generatedAt: r.generatedAt.toISOString(),
        insights: r.insights,
      })),
      readOnly: true, // PHASE 8A: Explicit read-only flag
      warning: 'This is a read-only dashboard. No auto-publish, no auto-edit, no auto-rewrite.',
    }, {
      headers: {
        'X-Read-Only': 'true', // PHASE 8A: Header indicating read-only
      },
    });
  } catch (error) {
    console.error('[Ads Intelligence API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load ads intelligence data' },
      { status: 500 }
    );
  }
}
