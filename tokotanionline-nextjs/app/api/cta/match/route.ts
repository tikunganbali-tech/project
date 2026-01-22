/**
 * FASE 5 — CTA Match API
 * 
 * Server-side endpoint to get matching CTA for a page.
 * Deterministic, no AI decision.
 */

import { NextRequest, NextResponse } from 'next/server';
import { matchCta, CtaMatchContext } from '@/lib/cta-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentType, contentTitle, contentBody, keywords, pagePath } = body;

    // Validate required fields
    if (!contentType || !pagePath) {
      return NextResponse.json(
        { error: 'contentType and pagePath are required' },
        { status: 400 }
      );
    }

    // Build context
    const context: CtaMatchContext = {
      contentType: contentType as 'blog' | 'product' | 'home' | 'other',
      contentTitle,
      contentBody,
      keywords: keywords || [],
      pagePath,
    };

    // Match CTA
    const result = await matchCta(context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CTA-API] Error:', error);
    // Fail-safe: return no CTA on error
    return NextResponse.json(
      { cta: null, reason: 'Error matching CTA' },
      { status: 500 }
    );
  }
}
