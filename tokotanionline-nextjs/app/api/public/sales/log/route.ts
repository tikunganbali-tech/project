/**
 * F6-C — OBSERVABILITY MINIMAL (OPS-FRIENDLY)
 * 
 * POST /api/public/sales/log
 * 
 * Fungsi: Public endpoint untuk client-side logging (proxy to internal)
 * 
 * Events:
 * - buy_button_clicked
 * - sales_channel_selected
 * - sales_disabled_blocked
 * 
 * Prinsip:
 * - Public endpoint (no auth required)
 * - Rate-limited (simple)
 * - Proxies to internal endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// Simple in-memory rate limit (5 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { event, productId, metadata } = body;

    // Validation
    if (!event || typeof event !== 'string') {
      return NextResponse.json(
        { error: 'event is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents = ['buy_button_clicked', 'sales_channel_selected', 'sales_disabled_blocked'];
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: `Invalid event. Must be one of: ${validEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Log to database (simple table for ops-friendly querying)
    try {
      await prisma.eventLog.create({
        data: {
          event: `sales_${event}`, // Prefix untuk easy filtering
          url: `/products/${productId || 'unknown'}`,
          meta: {
            event,
            productId: productId || null,
            ...metadata,
            timestamp: new Date().toISOString(),
            source: 'client',
          },
        },
      });
    } catch (dbError: any) {
      // Log to console as fallback
      logger.error(`[sales/log] Database error: ${dbError.message}`);
      console.log(`[SALES_LOG] ${event} | productId: ${productId || 'N/A'} | metadata:`, metadata);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[sales/log] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
