/**
 * PHASE G — Rate Limiting Configuration
 * 
 * Rate limiting untuk admin, AI, dan public APIs
 * 
 * Kebijakan (default):
 * - Admin API: 60 req/menit/IP
 * - AI endpoints: 10 req/menit/user
 * - Public API: 300 req/menit/IP
 */

import { NextRequest } from 'next/server';
import { checkRateLimitEnhanced, RATE_LIMITS } from './rate-limit-enhanced';
import { getServerSession } from '@/lib/auth';

/**
 * PHASE G: Get identifier for rate limiting
 * 
 * @param request - NextRequest object
 * @param type - Rate limit type
 * @returns Identifier (IP for public/admin, userId for AI)
 */
async function getRateLimitIdentifier(
  request: NextRequest,
  type: 'admin' | 'ai' | 'public'
): Promise<string> {
  if (type === 'ai') {
    // AI endpoints: per user
    const session = await getServerSession();
    if (session?.user) {
      return (session.user as any).id || 'anonymous';
    }
    return 'anonymous';
  }

  // Admin and public: per IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  return ip;
}

/**
 * PHASE G: Check rate limit for admin API
 * 
 * @param request - NextRequest object
 * @returns Rate limit result
 */
export async function checkAdminRateLimit(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request, 'admin');
  
  // PHASE G: Admin API: 60 req/menit/IP
  return await checkRateLimitEnhanced(identifier, 'admin', request);
}

/**
 * PHASE G: Check rate limit for AI endpoints
 * 
 * @param request - NextRequest object
 * @returns Rate limit result
 */
export async function checkAIRateLimit(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request, 'ai');
  
  // PHASE G: AI endpoints: 10 req/menit/user
  return await checkRateLimitEnhanced(identifier, 'ai', request);
}

/**
 * PHASE G: Check rate limit for public API
 * 
 * @param request - NextRequest object
 * @returns Rate limit result
 */
export async function checkPublicRateLimit(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request, 'public');
  
  // PHASE G: Public API: 300 req/menit/IP
  return await checkRateLimitEnhanced(identifier, 'public', request);
}

/**
 * PHASE G: Apply rate limit middleware
 * 
 * Returns 429 if rate limit exceeded
 * 
 * @param request - NextRequest object
 * @param type - Rate limit type
 * @returns NextResponse with 429 if exceeded, null if allowed
 */
/**
 * PHASE G: Apply rate limit middleware
 * 
 * Returns 429 if rate limit exceeded
 * 
 * @param request - NextRequest object
 * @param type - Rate limit type
 * @returns NextResponse with 429 if exceeded, null if allowed
 */
export async function applyRateLimit(
  request: NextRequest,
  type: 'admin' | 'ai' | 'public'
): Promise<{ allowed: boolean; response?: Response }> {
  let result;
  
  if (type === 'admin') {
    result = await checkAdminRateLimit(request);
  } else if (type === 'ai') {
    result = await checkAIRateLimit(request);
  } else {
    result = await checkPublicRateLimit(request);
  }

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
