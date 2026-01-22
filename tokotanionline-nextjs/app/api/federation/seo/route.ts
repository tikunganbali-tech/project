/**
 * PHASE 9A: Federation SEO API (READ-ONLY)
 * 
 * GET /api/federation/seo
 * 
 * Provides read-only SEO summaries for partners
 * - SEO performance summaries
 * - Ranking summaries
 * - Optimization opportunities (high-level only)
 * 
 * ❌ NO raw content
 * ❌ NO API keys
 * ❌ NO integration configs
 * ❌ NO event write
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerAuth, hasScopeAccess, filterScopesByRequest } from '@/lib/partner-auth';
import { logPartnerAccess, getClientIp, getUserAgent, sanitizeRequestData } from '@/lib/partner-audit';
import { prisma } from '@/lib/prisma';

const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(partnerId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(partnerId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(partnerId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (limit.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let statusCode = 200;
  let error: string | undefined;
  let responseSize = 0;

  try {
    // 🔒 GUARD 1: Partner Authentication
    const authResult = await requirePartnerAuth(request);

    // 🔒 GUARD 2: Rate Limiting
    if (!checkRateLimit(authResult.partner.id)) {
      statusCode = 429;
      error = 'Rate limit exceeded';
      await logPartnerAccess({
        partnerId: authResult.partner.id,
        action: 'api.read.seo',
        endpoint: '/api/federation/seo',
        method: 'GET',
        statusCode: 429,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        requestData: sanitizeRequestData({ rateLimitExceeded: true }),
        error: 'Rate limit exceeded',
      });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 100 requests per hour.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brand_id') || null;
    const localeId = searchParams.get('locale') || null;
    const timeframe = searchParams.get('timeframe') || '7d';
    const channel = searchParams.get('channel') || null;
    const pageType = searchParams.get('page_type') || null;

    // 🔒 GUARD 3: Scope Validation
    if (!hasScopeAccess(authResult.scopes, brandId, localeId, channel, pageType)) {
      statusCode = 403;
      error = 'Access denied: Scope not allowed';
      await logPartnerAccess({
        partnerId: authResult.partner.id,
        action: 'api.read.seo',
        endpoint: '/api/federation/seo',
        method: 'GET',
        statusCode: 403,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        requestData: sanitizeRequestData({ brandId, localeId, channel, pageType }),
        error: 'Scope not allowed',
      });
      return NextResponse.json(
        { error: 'Access denied: You do not have access to this scope' },
        { status: 403 }
      );
    }

    // Filter scopes by request
    const allowedScopes = filterScopesByRequest(
      authResult.scopes,
      brandId,
      localeId,
      channel,
      pageType
    );

    // Validate timeframe
    if (!['1d', '7d', '30d', '90d'].includes(timeframe)) {
      statusCode = 400;
      error = 'Invalid timeframe';
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be: 1d, 7d, 30d, or 90d' },
        { status: 400 }
      );
    }

    // Calculate date range
    const days = parseInt(timeframe.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: any = {};

    const brandIds = allowedScopes
      .map((s) => s.brandId)
      .filter((id): id is string => id !== null);
    if (brandIds.length > 0) {
      where.brandId = { in: brandIds };
    }

    const localeIds = allowedScopes
      .map((s) => s.localeId)
      .filter((id): id is string => id !== null);
    if (localeIds.length > 0) {
      where.localeId = { in: localeIds };
    }

    // Aggregate SEO data (read-only, no raw content)
    const seo = await aggregatePartnerSEO(where, startDate, endDate);

    const response = {
      partner_id: authResult.partner.partnerId,
      timeframe,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      seo,
      read_only: true,
      warning: 'This is a read-only API. No content access, no edit, no publish, no event write.',
    };

    const responseBody = JSON.stringify(response);
    responseSize = Buffer.byteLength(responseBody, 'utf8');
    statusCode = 200;

    // Audit log
    const durationMs = Date.now() - startTime;
    await logPartnerAccess({
      partnerId: authResult.partner.id,
      action: 'api.read.seo',
      endpoint: '/api/federation/seo',
      method: 'GET',
      statusCode,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      requestData: sanitizeRequestData({
        brandId,
        localeId,
        timeframe,
        channel,
        pageType,
      }),
      responseSize,
      durationMs,
      error,
    });

    return NextResponse.json(response, {
      headers: {
        'X-Read-Only': 'true',
        'X-Partner-Id': authResult.partner.partnerId,
        'X-Rate-Limit-Remaining': String(
          RATE_LIMIT_REQUESTS - (rateLimitMap.get(authResult.partner.id)?.count || 0)
        ),
      },
    });
  } catch (err: any) {
    statusCode = err.status || 500;
    error = err.message || 'Internal server error';

    let partnerId = 'unknown';
    try {
      const authResult = await requirePartnerAuth(request);
      partnerId = authResult.partner.id;
    } catch {
      // Ignore auth errors in error handler
    }

    await logPartnerAccess({
      partnerId,
      action: 'api.read.seo',
      endpoint: '/api/federation/seo',
      method: 'GET',
      statusCode,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      error,
    });

    return NextResponse.json(
      { error: error || 'Failed to fetch SEO data' },
      { status: statusCode }
    );
  }
}

/**
 * Aggregate SEO data for partner (READ-ONLY)
 */
async function aggregatePartnerSEO(
  where: any,
  startDate: Date,
  endDate: Date
): Promise<any> {
  // PHASE 9A: Aggregate SEO summaries
  // ❌ NO raw content access
  // ❌ NO API keys
  // ❌ NO integration configs

  const seoMetadata = await prisma.seoMetadata.findMany({
    where: {
      ...where,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      // Only public metadata, not raw content
      id: true,
      entityType: true,
      metaTitle: true,
      metaDescription: true,
      createdAt: true,
    },
  });

  return {
    total_pages: seoMetadata.length,
    avg_seo_score: 75, // Placeholder
    avg_position: 25, // Placeholder
    ranking_distribution: {
      '1-10': 0,
      '11-20': 0,
      '21-50': 0,
      '51-100': 0,
      '100+': 0,
    },
    optimization_opportunities: [], // High-level only, no raw content
    generated_at: new Date().toISOString(),
  };
}

// ❌ NO MUTATION METHODS
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. This is a read-only endpoint.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. This is a read-only endpoint.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. This is a read-only endpoint.' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. This is a read-only endpoint.' },
    { status: 405 }
  );
}
