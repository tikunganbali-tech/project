/**
 * STEP 21-3 - Rate Limit & Throttle for Admin APIs
 * 
 * Read-heavy endpoints: soft limit (per user)
 * Execute endpoint: strict limit
 * Tujuan: cegah spam & mis-click
 */

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// FASE 6.2: Rate limit configuration
export const RATE_LIMITS = {
  // Read endpoints (soft limit)
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute per user
  },
  // Execute endpoint (strict limit)
  execute: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute per user (strict)
  },
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute per user
  },
  // FASE 6.2: Login endpoint (prevent brute force)
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes per IP
  },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a user
 */
export function checkRateLimit(
  userId: string,
  type: 'read' | 'execute' | 'api' | 'login'
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const key = `${userId}:${type}`;

  const record = rateLimitStore.get(key);

  // Clean up old entries
  if (record && now > record.resetTime) {
    rateLimitStore.delete(key);
  }

  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

