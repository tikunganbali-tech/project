/**
 * STEP 23C-1 — CAMPAIGN LIST (READ-ONLY)
 *
 * GET /api/admin/marketing/campaigns
 *
 * Data source:
 * - MarketingCampaign (master data)
 * - CampaignPerformance (aggregated, 7-day window)
 * - Attribution API (LINEAR, window 7 days) from Go engine
 *
 * ❌ No write
 * ❌ No trigger
 * ✅ Read-only, explainable
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';
const ATTRIBUTION_RULE = 'LINEAR';
const WINDOW_DAYS = 7;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !['admin', 'super_admin'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Base campaigns
    const campaigns = await prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!campaigns.length) {
      return NextResponse.json({
        campaigns: [],
        meta: { rule: ATTRIBUTION_RULE, windowDays: WINDOW_DAYS },
      });
    }

    // Performance (7-day window, aggregated in query)
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

    const performance = await prisma.campaignPerformance.groupBy({
      by: ['campaignId'],
      where: { date: { gte: windowStart } },
      _sum: {
        clicks: true,
        conversions: true,
        revenue: true,
      },
    });

    const perfMap = new Map(
      performance.map((p) => [
        p.campaignId,
        {
          clicks: p._sum.clicks || 0,
          conversions: p._sum.conversions || 0,
          revenue: p._sum.revenue || 0,
        },
      ])
    );

    // Attribution from Go engine (read-only)
    const attributionMap = new Map<
      string,
      { score: number; explanation?: string | null; rule: string; windowDays: number; primaryText: string }
    >();

    try {
      const ids = campaigns.map((c) => c.id).join(',');
      const query = new URLSearchParams({
        rule: ATTRIBUTION_RULE,
        windowDays: WINDOW_DAYS.toString(),
      });
      if (ids) {
        query.set('campaignId', ids);
      }

      const engineUrl = `${GO_ENGINE_API_URL}/api/marketing/attribution?${query.toString()}`;
      const response = await fetch(engineUrl, { cache: 'no-store' });

      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        results.forEach((item: any) => {
          const score = typeof item?.score === 'number' ? item.score : 0;
          const percent = Math.round(score * 100);
          attributionMap.set(item.campaignId, {
            score,
            explanation: item.explanation || null,
            rule: ATTRIBUTION_RULE,
            windowDays: WINDOW_DAYS,
            primaryText: `${percent}% kontribusi terhadap konversi minggu ini`,
          });
        });
      } else {
        const errorText = await response.text();
        logger.warn('Attribution API non-200', { status: response.status, error: errorText });
      }
    } catch (error: any) {
      logger.warn('Attribution API fetch failed', error);
    }

    const summaries = campaigns.map((campaign) => {
      const perf = perfMap.get(campaign.id) || { clicks: 0, conversions: 0, revenue: 0 };
      const attribution = attributionMap.get(campaign.id);

      return {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        objective: campaign.objective,
        metrics: perf,
        attribution: attribution
          ? {
              ...attribution,
              percent: Math.round((attribution.score || 0) * 100),
            }
          : {
              score: null,
              percent: null,
              explanation: null,
              rule: ATTRIBUTION_RULE,
              windowDays: WINDOW_DAYS,
              primaryText: 'Belum ada data atribusi',
            },
      };
    });

    return NextResponse.json({
      campaigns: summaries,
      meta: { rule: ATTRIBUTION_RULE, windowDays: WINDOW_DAYS },
    });
  } catch (error: any) {
    logger.error('Failed to load campaign list', error);
    return NextResponse.json({ error: 'Failed to load campaign list' }, { status: 500 });
  }
}

