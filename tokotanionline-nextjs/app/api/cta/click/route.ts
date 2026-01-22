/**
 * FASE 5 — CTA Click Tracking API
 * 
 * Minimal, non-invasive tracking of CTA clicks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackCtaClick } from '@/lib/cta-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ctaId, pagePath, pageType } = body;

    if (!ctaId || !pagePath) {
      return NextResponse.json(
        { error: 'ctaId and pagePath are required' },
        { status: 400 }
      );
    }

    // Track click (non-blocking)
    await trackCtaClick(ctaId, pagePath, pageType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CTA-CLICK-API] Error:', error);
    // Return success even on error - tracking is non-critical
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
