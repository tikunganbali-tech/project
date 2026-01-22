/**
 * FASE 5 — CTA RULE ENGINE
 * 
 * Server-side, deterministic rule matching for CTAs.
 * No AI, no random, no ML - pure rule-based matching.
 * 
 * FAIL-FAST PRINCIPLES:
 * - Invalid config → CTA auto-disable
 * - Error in matching → return null (no CTA)
 * - All errors logged to server
 */

import { prisma } from '@/lib/db';

export interface CtaMatchContext {
  contentType: 'blog' | 'product' | 'home' | 'other';
  contentTitle?: string;
  contentBody?: string;
  keywords?: string[];
  pagePath: string;
}

export interface CtaResult {
  cta: {
    id: string;
    type: 'whatsapp' | 'checkout' | 'link';
    label: string;
    targetUrl: string;
    placement: 'inline' | 'sidebar' | 'footer';
  } | null;
  reason?: string; // For logging/debugging
}

/**
 * Match CTA based on deterministic rules
 * Returns null if no match (fail-safe)
 */
export async function matchCta(context: CtaMatchContext): Promise<CtaResult> {
  try {
    // Validate context
    if (!context.contentType || !context.pagePath) {
      console.error('[CTA-ENGINE] Invalid context:', context);
      return { cta: null, reason: 'Invalid context' };
    }

    // Get all enabled CTAs
    const ctas = await prisma.ctaConfig.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        createdAt: 'asc', // First created = priority
      },
    });

    if (ctas.length === 0) {
      return { cta: null, reason: 'No enabled CTAs' };
    }

    // Match against each CTA (first match wins)
    for (const cta of ctas) {
      // Validate CTA config
      if (!cta.type || !cta.label || !cta.targetUrl) {
        console.error(`[CTA-ENGINE] Invalid CTA config: ${cta.id}`);
        // Auto-disable invalid CTA
        try {
          await prisma.ctaConfig.update({
            where: { id: cta.id },
            data: { enabled: false },
          });
          console.error(`[CTA-ENGINE] Auto-disabled invalid CTA: ${cta.id}`);
        } catch (updateError) {
          console.error(`[CTA-ENGINE] Failed to disable invalid CTA: ${cta.id}`, updateError);
        }
        continue;
      }

      if (matchCtaRules(cta, context)) {
        return {
          cta: {
            id: cta.id,
            type: cta.type as 'whatsapp' | 'checkout' | 'link',
            label: cta.label,
            targetUrl: cta.targetUrl,
            placement: cta.placement as 'inline' | 'sidebar' | 'footer',
          },
          reason: `Matched CTA ${cta.id}`,
        };
      }
    }

    return { cta: null, reason: 'No matching CTA rules' };
  } catch (error) {
    // Fail-fast: log error and return no CTA
    console.error('[CTA-ENGINE] Error matching CTA:', error);
    return { cta: null, reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Deterministic rule matching
 */
function matchCtaRules(
  cta: {
    contentType: string;
    keywordsInclude: string | null;
    keywordsExclude: string | null;
  },
  context: CtaMatchContext
): boolean {
  try {
    // Rule 1: Content type match
    if (cta.contentType !== 'any' && cta.contentType !== context.contentType) {
      return false;
    }

    // Rule 2: Keyword include/exclude
    let includeKeywords: string[] = [];
    let excludeKeywords: string[] = [];

    try {
      includeKeywords = cta.keywordsInclude ? JSON.parse(cta.keywordsInclude) : [];
      excludeKeywords = cta.keywordsExclude ? JSON.parse(cta.keywordsExclude) : [];
    } catch (parseError) {
      // Invalid JSON in keywords → log and fail
      console.error(`[CTA-ENGINE] Invalid keywords JSON for CTA: ${cta.contentType}`, parseError);
      return false;
    }

    // Build searchable text
    const searchText = [
      context.contentTitle || '',
      context.contentBody || '',
      ...(context.keywords || []),
    ]
      .join(' ')
      .toLowerCase();

    // Check exclude keywords first (fail fast)
    for (const keyword of excludeKeywords) {
      if (typeof keyword === 'string' && searchText.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    // Check include keywords (if any)
    if (includeKeywords.length > 0) {
      const hasIncludeKeyword = includeKeywords.some((keyword: string) =>
        typeof keyword === 'string' && searchText.includes(keyword.toLowerCase())
      );
      if (!hasIncludeKeyword) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // Fail-safe: log and return false
    console.error('[CTA-ENGINE] Error in rule matching:', error);
    return false;
  }
}

/**
 * Track CTA click (non-blocking)
 */
export async function trackCtaClick(
  ctaId: string,
  pagePath: string,
  pageType?: string
): Promise<void> {
  try {
    await prisma.ctaClick.create({
      data: {
        ctaId,
        pagePath,
        pageType: pageType || null,
      },
    });
  } catch (error) {
    // Log but don't fail - tracking is non-critical
    console.error('[CTA-ENGINE] Error tracking CTA click:', error);
  }
}

/**
 * Get CTA statistics
 */
export async function getCtaStats(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalClicks, clicksByCta, clicksByPage] = await Promise.all([
    // Total clicks
    prisma.ctaClick.count({
      where: {
        timestamp: {
          gte: since,
        },
      },
    }),

    // Clicks by CTA
    prisma.ctaClick.groupBy({
      by: ['ctaId'],
      where: {
        timestamp: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
    }),

    // Clicks by page type
    prisma.ctaClick.groupBy({
      by: ['pageType'],
      where: {
        timestamp: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
    }),
  ]);

  return {
    totalClicks,
    clicksByCta: clicksByCta.map((item) => ({
      ctaId: item.ctaId,
      count: item._count.id,
    })),
    clicksByPage: clicksByPage.map((item) => ({
      pageType: item.pageType || 'unknown',
      count: item._count.id,
    })),
  };
}
