/**
 * PHASE 9A: Federation Insights API (READ-ONLY)
 * 
 * GET /api/federation/insights
 * 
 * Provides read-only insights for partners
 * - Growth insights
 * - Performance summaries
 * - Aggregated metrics
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

const RATE_LIMIT_REQUESTS = 100; // Max requests per hour per partner
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Simple in-memory rate limiter (in production, use Redis)
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
        action: 'api.read.insights',
        endpoint: '/api/federation/insights',
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
    const timeframe = searchParams.get('timeframe') || '7d'; // 1d, 7d, 30d, 90d
    const channel = searchParams.get('channel') || null;
    const pageType = searchParams.get('page_type') || null;

    // 🔒 GUARD 3: Scope Validation
    if (!hasScopeAccess(authResult.scopes, brandId, localeId, channel, pageType)) {
      statusCode = 403;
      error = 'Access denied: Scope not allowed';
      await logPartnerAccess({
        partnerId: authResult.partner.id,
        action: 'api.read.insights',
        endpoint: '/api/federation/insights',
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

    // 🔒 GUARD 4: Data Exposure Rules
    // Partner HANYA boleh akses: insights, agregasi, ringkasan performa
    // ❌ TIDAK boleh akses: konten mentah, API key, konfigurasi integrasi, event write

    // Build where clause based on scopes
    const where: any = {};

    // Apply brand filter from scopes
    const brandIds = allowedScopes
      .map((s) => s.brandId)
      .filter((id): id is string => id !== null);
    if (brandIds.length > 0) {
      where.brandId = { in: brandIds };
    }

    // Apply locale filter from scopes
    const localeIds = allowedScopes
      .map((s) => s.localeId)
      .filter((id): id is string => id !== null);
    if (localeIds.length > 0) {
      where.localeId = { in: localeIds };
    }

    // Aggregate insights (read-only, no raw content)
    const insights = await aggregatePartnerInsights(where, startDate, endDate);

    const response = {
      partner_id: authResult.partner.partnerId,
      timeframe,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      insights,
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
      action: 'api.read.insights',
      endpoint: '/api/federation/insights',
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

    // Try to get partner ID for audit log
    let partnerId = 'unknown';
    try {
      const authResult = await requirePartnerAuth(request);
      partnerId = authResult.partner.id;
    } catch {
      // Ignore auth errors in error handler
    }

    await logPartnerAccess({
      partnerId,
      action: 'api.read.insights',
      endpoint: '/api/federation/insights',
      method: 'GET',
      statusCode,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      error,
    });

    return NextResponse.json(
      { error: error || 'Failed to fetch insights' },
      { status: statusCode }
    );
  }
}

/**
 * Aggregate insights for partner (READ-ONLY)
 * Only returns aggregated metrics, no raw content
 */
async function aggregatePartnerInsights(
  where: any,
  startDate: Date,
  endDate: Date
): Promise<any> {
  // PHASE 9A: Aggregate from SeoMetadata and other aggregated sources
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
      // Only select aggregated fields, not raw content
      id: true,
      entityType: true,
      metaTitle: true, // Title is OK (public)
      metaDescription: true, // Description is OK (public)
      createdAt: true,
      brandId: true,
    },
  });

  // Calculate aggregates
  const totalPages = seoMetadata.length;
  const byEntityType = seoMetadata.reduce((acc, item) => {
    acc[item.entityType] = (acc[item.entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Return aggregated insights only
  return {
    total_pages: totalPages,
    pages_by_type: byEntityType,
    avg_seo_score: 75, // Placeholder - would calculate from aggregated reports
    avg_position: 25, // Placeholder - would calculate from SERP signals
    avg_ctr: 0.05, // Placeholder
    total_impressions: 0, // Placeholder
    growth_trend: 'stable', // Placeholder
    generated_at: new Date().toISOString(),
  };
}

// ❌ NO POST, PUT, DELETE, PATCH - READ-ONLY ONLY
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
