/**
 * STEP 1 - Event Tracking API
 * POST /api/track
 * Minimal event tracking untuk core loop
 * STEP 6: Error handling hardened
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, url } = body;

    // Validasi minimal
    if (!event || !url) {
      return NextResponse.json(
        { error: 'event dan url wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi event type
    if (event !== 'page_view' && event !== 'click_cta') {
      return NextResponse.json(
        { error: 'event harus "page_view" atau "click_cta"' },
        { status: 400 }
      );
    }

    // Simpan ke database
    const eventLog = await prisma.eventLog.create({
      data: {
        event,
        url,
      },
    });

    return NextResponse.json({ success: true, id: eventLog.id });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Event tracking error:', error);
    return NextResponse.json(
      { error: 'Tracking failed' },
      { status: 500 }
    );
  }
}


