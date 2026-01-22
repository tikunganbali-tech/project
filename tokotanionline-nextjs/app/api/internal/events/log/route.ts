/**
 * STEP 22B-2 - INTERNAL EVENT WRITE API (SERVER-ONLY)
 * 
 * POST /api/internal/events/log
 * 
 * Prinsip KERAS:
 * ❌ Tidak ada kirim ke FB/GA/TikTok
 * ❌ Tidak ada frontend logic
 * ❌ Tidak ada auto-fire
 * ✅ Hanya write ke MarketingEventLog
 * ✅ Append-only
 * ✅ Aman walau UI ditutup
 * ✅ Audit-friendly
 * 
 * 🔒 SECURITY:
 * - Internal secret header (x-internal-key)
 * - Cocokkan dengan INTERNAL_EVENT_KEY dari env
 * - Tidak pakai session user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// POST /api/internal/events/log
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
      logger.warn('Unauthorized access attempt to /api/internal/events/log (invalid key)');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { eventKey, entityType, entityId, payload, source, sessionId, userId } = body;

    // Minimal validation: required fields only
    if (!eventKey || typeof eventKey !== 'string') {
      return NextResponse.json(
        { error: 'eventKey is required and must be a string' },
        { status: 400 }
      );
    }

    if (!entityType || typeof entityType !== 'string') {
      return NextResponse.json(
        { error: 'entityType is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate entityType enum
    const validEntityTypes = ['PRODUCT', 'BLOG', 'PAGE', 'CART', 'ORDER', 'SEARCH'] as const;
    if (!validEntityTypes.includes(entityType as any)) {
      return NextResponse.json(
        { error: `entityType must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'payload is required and must be an object' },
        { status: 400 }
      );
    }

    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { error: 'source is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate source enum
    const validSources = ['WEB', 'ENGINE', 'ADMIN'] as const;
    if (!validSources.includes(source as any)) {
      return NextResponse.json(
        { error: `source must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Optional fields: entityId, sessionId, userId (can be null or string)
    // No additional validation needed - they are nullable

    // Append-only insert to MarketingEventLog
    // No dedup, no business logic, just insert
    await prisma.marketingEventLog.create({
      data: {
        eventKey: eventKey.trim(),
        entityType: entityType as 'PRODUCT' | 'BLOG' | 'PAGE' | 'CART' | 'ORDER' | 'SEARCH',
        entityId: entityId || null,
        payload: payload,
        source: source as 'WEB' | 'ENGINE' | 'ADMIN',
        sessionId: sessionId || null,
        userId: userId || null,
      },
    });

    // Return success (no data returned - append-only)
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error('Error logging marketing event:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation (should not happen, but handle gracefully)
      return NextResponse.json(
        { error: 'Event already logged' },
        { status: 409 }
      );
    }

    // Don't leak error details
    return NextResponse.json(
      { error: 'Failed to log event' },
      { status: 500 }
    );
  }
}

