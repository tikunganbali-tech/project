/**
 * PHASE 3: Analytics → SEO (Satu Arah)
 * 
 * Analytics HANYA:
 * - Mencatat CTR, dwell time, bounce
 * - Emit USER_INTERACTION_UPDATED
 * 
 * Analytics TIDAK mengirim ke AI Generator
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, version, pageType, ctr, dwellTime, bounceRate } = body;

    if (!pageId || !version) {
      return NextResponse.json(
        { error: 'pageId and version are required' },
        { status: 400 }
      );
    }

    // PHASE 3: Emit USER_INTERACTION_UPDATED event
    const eventUrl = `${ENGINE_HUB_URL}/api/v2/events/user-interaction`;
    const eventResponse = await fetch(eventUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageId,
        version,
        pageType: pageType || 'blog',
        ctr: ctr || 0,
        dwellTime: dwellTime || 0,
        bounceRate: bounceRate || 0,
      }),
    });

    if (!eventResponse.ok) {
      console.error('[USER INTERACTION] Failed to emit event:', await eventResponse.text());
      return NextResponse.json(
        { error: 'Failed to emit event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User interaction data recorded',
    });
  } catch (error: any) {
    console.error('[USER INTERACTION] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
