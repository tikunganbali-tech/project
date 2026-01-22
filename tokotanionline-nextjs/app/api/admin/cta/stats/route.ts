/**
 * FASE 5 — Admin CTA Statistics API
 * 
 * Returns basic insights: total views, CTA clicks, etc.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getCtaStats } from '@/lib/cta-engine';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Get CTA stats
    const ctaStats = await getCtaStats(days);

    // Get page views (from TrackingEvent)
    const since = new Date();
    since.setDate(since.getDate() - days);

    const totalViews = await prisma.trackingEvent.count({
      where: {
        eventType: 'PageView',
        createdAt: {
          gte: since,
        },
      },
    });

    // Get CTA details with click counts
    const ctas = await prisma.ctaConfig.findMany({
      include: {
        _count: {
          select: {
            clicks: true,
          },
        },
      },
    });

    return NextResponse.json({
      period: {
        days,
        since: since.toISOString(),
      },
      views: {
        total: totalViews,
      },
      cta: {
        totalClicks: ctaStats.totalClicks,
        clicksByCta: ctaStats.clicksByCta,
        clicksByPage: ctaStats.clicksByPage,
        ctas: ctas.map((cta) => ({
          id: cta.id,
          label: cta.label,
          type: cta.type,
          enabled: cta.enabled,
          clickCount: cta._count.clicks,
        })),
      },
    });
  } catch (error) {
    console.error('[ADMIN-CTA-STATS-API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
