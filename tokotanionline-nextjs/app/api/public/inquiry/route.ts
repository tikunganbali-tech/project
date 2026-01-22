/**
 * STEP P2B-1: Public Inquiry API (APPEND-ONLY, SAFE)
 * POST /api/public/inquiry
 * 
 * Purpose: Capture public inquiries (contact / question / interest)
 * - Append-only (no update, no delete)
 * - No engine trigger
 * - No mutation to business tables
 * - No system state change
 * - Rate limited (IP-based)
 * - Honeypot anti-bot
 * - Fail-soft (never 500)
 * 
 * Request Body:
 * {
 *   name: string (required, max 200)
 *   contact: string (required, max 200)
 *   message: string (required, max 2000)
 *   context: 'HOME' | 'PRODUCT' | 'BLOG' | 'OTHER' (required)
 *   contextId?: string (optional, max 100)
 *   _honeypot?: string (hidden field, must be empty)
 * }
 * 
 * Response:
 * { "ok": true }
 * 
 * Errors:
 * - 400: Validation error
 * - 429: Rate limit exceeded
 * - 200: Success (even if DB fails, logged but not exposed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Rate limiting store (IP-based, in-memory)
const inquiryRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const INQUIRY_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 inquiries per minute per IP (strict)
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
function checkInquiryRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = inquiryRateLimitStore.get(ip);

  // Clean up old entries
  if (record && now > record.resetTime) {
    inquiryRateLimitStore.delete(ip);
  }

  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + INQUIRY_RATE_LIMIT.windowMs;
    inquiryRateLimitStore.set(ip, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: INQUIRY_RATE_LIMIT.maxRequests - 1,
      resetTime,
    };
  }

  if (record.count >= INQUIRY_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: INQUIRY_RATE_LIMIT.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Validate inquiry payload
 */
function validateInquiry(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Name validation
  if (!body.name || typeof body.name !== 'string') {
    errors.push('Name is required');
  } else if (body.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (body.name.length > 200) {
    errors.push('Name must be 200 characters or less');
  }

  // Contact validation
  if (!body.contact || typeof body.contact !== 'string') {
    errors.push('Contact is required');
  } else if (body.contact.trim().length === 0) {
    errors.push('Contact cannot be empty');
  } else if (body.contact.length > 200) {
    errors.push('Contact must be 200 characters or less');
  }

  // Message validation
  if (!body.message || typeof body.message !== 'string') {
    errors.push('Message is required');
  } else if (body.message.trim().length === 0) {
    errors.push('Message cannot be empty');
  } else if (body.message.length > 2000) {
    errors.push('Message must be 2000 characters or less');
  }

  // Context validation
  const validContexts = ['HOME', 'PRODUCT', 'BLOG', 'OTHER'];
  if (!body.context || typeof body.context !== 'string') {
    errors.push('Context is required');
  } else if (!validContexts.includes(body.context)) {
    errors.push(`Context must be one of: ${validContexts.join(', ')}`);
  }

  // ContextId validation (optional)
  if (body.contextId !== undefined && body.contextId !== null) {
    if (typeof body.contextId !== 'string') {
      errors.push('ContextId must be a string');
    } else if (body.contextId.length > 100) {
      errors.push('ContextId must be 100 characters or less');
    }
  }

  // Honeypot check (anti-bot)
  if (body._honeypot && body._honeypot.trim().length > 0) {
    // Bot detected - silently reject but return success
    return { valid: false, errors: [] }; // Don't expose honeypot
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || null;

    // Check rate limit
    const rateLimit = checkInquiryRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    // Validate payload
    const validation = validateInquiry(body);
    if (!validation.valid) {
      // Honeypot detected - return success silently
      if (validation.errors.length === 0) {
        return NextResponse.json({ ok: true });
      }
      
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Check payload size (additional safety)
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > 10000) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 400 }
      );
    }

    // Insert inquiry (fail-soft: if DB fails, log but return success)
    try {
      await prisma.publicInquiry.create({
        data: {
          name: body.name.trim(),
          contact: body.contact.trim(),
          message: body.message.trim(),
          context: body.context,
          contextId: body.contextId?.trim() || null,
          ipAddress: ip,
          userAgent,
        },
      });
    } catch (dbError: any) {
      // Fail-soft: log error but return success to user
      console.error('Failed to save inquiry to database:', dbError);
      // In production, you might want to log to external service
      // For now, we return success to avoid exposing system state
    }

    // Return success
    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      }
    );
  } catch (error: any) {
    // Fail-soft: never return 500
    console.error('Unexpected error in inquiry endpoint:', error);
    return NextResponse.json(
      { ok: true }, // Return success even on unexpected errors
      { status: 200 }
    );
  }
}

// Explicitly block other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
