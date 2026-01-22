/**
 * F6-C — OBSERVABILITY MINIMAL (OPS-FRIENDLY)
 * 
 * POST /api/internal/sales/log
 * 
 * Fungsi: Server-side logging untuk sales events
 * 
 * Events:
 * - buy_button_clicked
 * - sales_channel_selected
 * - sales_disabled_blocked
 * 
 * Prinsip:
 * - Log server-side only
 * - Tidak kirim ke pihak ketiga
 * - Tidak dashboard berlebihan
 * - Queryable dalam 30 detik
 * 
 * 🔒 SECURITY:
 * - Internal secret header (x-internal-key)
 * - Cocokkan dengan INTERNAL_EVENT_KEY dari env
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// POST /api/internal/sales/log
export async function POST(request: NextRequest) {
  try {
    // Guard: Internal key check
    const internalKey = request.headers.get('x-internal-key');
    const expectedKey = process.env.INTERNAL_EVENT_KEY;

    if (!expectedKey) {
      logger.error('INTERNAL_EVENT_KEY not configured in environment');
      return NextResponse.json(
        { error: 'Internal service not configured' },
        { status: 500 }
      );
    }

    if (!internalKey || internalKey !== expectedKey) {
      logger.warn('Unauthorized access attempt to /api/internal/sales/log (invalid key)');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
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
