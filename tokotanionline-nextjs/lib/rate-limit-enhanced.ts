/**
 * PHASE 10 - Enhanced Rate Limiting with Redis Support
 * 
 * Production-grade rate limiting with:
 * - Redis support for distributed systems
 * - IP-based and user-based limiting
 * - Different thresholds for public/admin/partner
 * - Soft block with logging
 * - Internal scheduler bypass
 */

import { NextRequest } from 'next/server';

// Rate limit configuration per endpoint type
export const RATE_LIMITS = {
  // PHASE G: Public endpoints (per IP) - 300 req/menit/IP
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // PHASE G: 300 requests per minute per IP (lebih longgar)
  },
  // PHASE G: Admin endpoints (per IP) - 60 req/menit/IP
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // PHASE G: 60 requests per minute per IP
  },
  // Partner endpoints (per token)
  partner: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute per token
  },
  // Login endpoint (strict, per IP)
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes per IP
  },
  // Execute endpoint (strict, per user)
  execute: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 executions per minute per user
  },
  // PHASE G: AI endpoints (per user) - 10 req/menit/user
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute per user
  },
  // API endpoints (general)
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

// In-memory fallback (for development or when Redis unavailable)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

// Redis client (lazy initialization)
let redisClient: any = null;

/**
 * Initialize Redis client (if REDIS_URL is set)
 */
async function initRedis() {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null; // Redis not configured, use in-memory
  }

  try {
    // Dynamic import to avoid requiring redis in dev
    // Use type assertion to prevent webpack from trying to resolve at build time
    const redis = await import('redis' as any).catch(() => null);
    if (!redis) {
      console.warn('[rate-limit] Redis module not available, using in-memory store');
      return null;
    }
    redisClient = redis.createClient({ url: redisUrl });
    await redisClient.connect();
    return redisClient;
  } catch (error: any) {
    // Handle both module resolution errors and connection errors
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('Cannot resolve')) {
      console.warn('[rate-limit] Redis module not installed, using in-memory store');
    } else {
      console.warn('[rate-limit] Redis connection failed, using in-memory store:', error?.message || error);
    }
    return null;
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : realIP 
    ? realIP.trim()
    : request.ip || 'unknown';
  return ip;
}

/**
 * Check if request is from internal scheduler
 */
export function isInternalScheduler(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const serviceToken = process.env.SCHEDULER_SERVICE_TOKEN;
  
  if (!serviceToken) return false;
  
  return authHeader === `Bearer ${serviceToken}`;
}

/**
 * Check rate limit (with Redis support)
 */
export async function checkRateLimitEnhanced(
  identifier: string, // IP, userId, or token
  type: keyof typeof RATE_LIMITS,
  request?: NextRequest
): Promise<RateLimitResult> {
  // Bypass for internal scheduler
  if (request && isInternalScheduler(request)) {
    return {
      allowed: true,
      remaining: Infinity,
      resetTime: Date.now() + RATE_LIMITS[type].windowMs,
      limit: RATE_LIMITS[type].maxRequests,
    };
  }

  const config = RATE_LIMITS[type];
  const now = Date.now();
  const key = `rate-limit:${type}:${identifier}`;
  const resetTime = now + config.windowMs;

  // Try Redis first
  const redis = await initRedis();
  if (redis) {
    try {
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= config.maxRequests) {
        // Set expiry if not set
        await redis.expire(key, Math.ceil(config.windowMs / 1000));
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          limit: config.maxRequests,
        };
      }

      // Increment counter
      const newCount = await redis.incr(key);
      await redis.expire(key, Math.ceil(config.windowMs / 1000));

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetTime,
        limit: config.maxRequests,
      };
    } catch (error) {
      console.error('[rate-limit] Redis error, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }

  // Fallback to in-memory store
  const record = inMemoryStore.get(key);

  // Clean up old entries
  if (record && now > record.resetTime) {
    inMemoryStore.delete(key);
  }

  if (!record || now > record.resetTime) {
    // New window
    inMemoryStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
      limit: config.maxRequests,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      limit: config.maxRequests,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Clean up old in-memory entries
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of Array.from(inMemoryStore.entries())) {
    if (now > record.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
