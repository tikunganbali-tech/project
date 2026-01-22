/**
 * Revenue Path API
 * Calculate conversion funnel and revenue metrics
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    // Get visits with buyer intent
    const totalVisits = await prisma.analyticsVisit.count({
      where: {
        isBot: false,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    });

    const buyerIntentVisits = await prisma.analyticsVisit.count({
      where: {
        isBot: false,
        intentType: 'BUYER_INTENT',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    });

    // Get conversions (CTA clicks or product clicks)
    const conversions = await prisma.analyticsVisit.count({
      where: {
        isBot: false,
        createdAt: { gte: dateFrom, lte: dateTo },
        OR: [
          { ctaClicks: { gt: 0 } },
          { productClicks: { gt: 0 } },
        ],
      },
    });

    // Estimate revenue (simplified - assume average order value)
    const avgOrderValue = 500000; // IDR
    const estimatedRevenue = conversions * avgOrderValue;
    const conversionRate = totalVisits > 0 ? (conversions / totalVisits) * 100 : 0;
    const revenuePerVisit = totalVisits > 0 ? estimatedRevenue / totalVisits : 0;

    // Get top converting pages
    const topConvertingPages = await prisma.analyticsVisit.groupBy({
      by: ['pagePath', 'pageTitle'],
      where: {
        isBot: false,
        createdAt: { gte: dateFrom, lte: dateTo },
        OR: [
          { ctaClicks: { gt: 0 } },
          { productClicks: { gt: 0 } },
        ],
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topPages = topConvertingPages.map(page => ({
      page: page.pageTitle || page.pagePath,
      conversions: page._count.id,
      revenue: page._count.id * avgOrderValue,
    }));

    return NextResponse.json({
      totalVisits,
      buyerIntentVisits,
      conversions,
      revenue: estimatedRevenue,
      conversionRate,
      revenuePerVisit,
      topConvertingPages: topPages,
    });
  } catch (error: any) {
    console.error('Error getting revenue path:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get revenue path' },
      { status: 500 }
    );
  }
}











