/**
 * Analytics Helper
 * Simple aggregation helper for STEP 7 - Analytics Ringkas (Read-Only)
 * No complex aggregation, no chart engines, just simple COUNT and GROUP BY queries
 */

import { prisma } from './db';

/**
 * Get analytics summary from EventLog
 * Returns totals, top pages, and recent events
 */
export async function getAnalyticsSummary() {
  try {
    // Get totals using COUNT
    const [totalEvents, totalPageViews, totalClickCta] = await Promise.all([
      prisma.eventLog.count(),
      prisma.eventLog.count({ where: { event: 'page_view' } }),
      prisma.eventLog.count({ where: { event: 'click_cta' } }),
    ]);

    // Get top 10 pages by page_view count (GROUP BY url)
    // Using Prisma groupBy for type safety
    const topPagesRaw = await prisma.eventLog.groupBy({
      by: ['url'],
      where: { event: 'page_view' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Format results
    const topPages = topPagesRaw.map((item) => ({
      url: item.url,
      count: item._count.id,
    }));

    // Get 20 recent events
    const recentEventsRaw = await prisma.eventLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        event: true,
        url: true,
        createdAt: true,
      },
    });

    // Format recent events
    const recentEvents = recentEventsRaw.map((event) => ({
      event: event.event,
      url: event.url,
      createdAt: event.createdAt.toISOString(),
    }));

    return {
      totals: {
        events: totalEvents,
        page_view: totalPageViews,
        click_cta: totalClickCta,
      },
      topPages,
      recentEvents,
    };
  } catch (error) {
    // Re-throw to let API route handle it with logger
    throw error;
  }
}
