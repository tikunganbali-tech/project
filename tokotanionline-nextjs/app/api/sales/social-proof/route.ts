/**
 * FASE F — F3: SOCIAL PROOF (BACKEND API)
 * POST /api/sales/social-proof
 * 
 * Purpose: Track social proof events (view/interest)
 * - Human-like, non-manipulative
 * - Rate-limited
 * - Lightweight events only
 * 
 * Request Body:
 * {
 *   event: 'view' | 'interest',
 *   productId?: string,
 *   productSlug?: string,
 *   location?: string (optional, IP-based or static pool)
 * }
 * 
 * Response:
 * { success: true }
 * 
 * F4: Fail-fast if SOCIAL_PROOF_ENABLED = false
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicSiteSettings } from '@/lib/site-settings';

// Rate limiting store (in-memory, IP-based)
const socialProofRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const SOCIAL_PROOF_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 events per minute per IP
};

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  return ip;
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = socialProofRateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // New window or expired
    const resetTime = now + SOCIAL_PROOF_RATE_LIMIT.windowMs;
    socialProofRateLimitStore.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: SOCIAL_PROOF_RATE_LIMIT.maxRequests - 1, resetTime };
  }

  if (record.count >= SOCIAL_PROOF_RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: SOCIAL_PROOF_RATE_LIMIT.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Cleanup old rate limit records (run periodically)
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of Array.from(socialProofRateLimitStore.entries())) {
    if (now > record.resetTime) {
      socialProofRateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export async function POST(request: NextRequest) {
  try {
    // F4: Kill-switch check
    const settings = await getPublicSiteSettings();
    if (!settings?.phaseFSocialProofEnabled) {
      // Fail-soft: return success but don't process
      return NextResponse.json({ success: true, message: 'Social proof disabled' });
    }

    // Get client IP
    const ip = getClientIP(request);

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate event type
    const { event, productId, productSlug, location } = body;

    if (!event || !['view', 'interest'].includes(event)) {
      return NextResponse.json(
        { error: 'event must be "view" or "interest"' },
        { status: 400 }
      );
    }

    // Validate: must have productId or productSlug
    if (!productId && !productSlug) {
      return NextResponse.json(
        { error: 'productId or productSlug is required' },
        { status: 400 }
      );
    }

    // Fail-soft: Log event but don't store in DB (FASE F spec: lightweight events)
    // In production, you might want to store in a lightweight table for analytics
    // For now, just log and return success

    console.log('[sales/social-proof] Event:', {
      event,
      productId,
      productSlug,
      location: location || 'Unknown',
      ip: ip.substring(0, 10) + '...', // Partial IP for privacy
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Event logged',
    });
  } catch (error: any) {
    console.error('[sales/social-proof] Error:', error);
    // Fail-soft: return success even on error
    return NextResponse.json({ success: true, message: 'Event logged' });
  }
}
