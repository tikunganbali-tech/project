/**
 * API: Track session chain
 * PHASE 6: Return Visitor
 */

import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Return visitor module not available
// import { trackSessionChain } from '@/lib/return-visitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, pageType, pageId, pageUrl } = body;

    if (!sessionId || !pageType || !pageId || !pageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // DISABLED: Return visitor module not available
    // const result = await trackSessionChain(sessionId, pageType, pageId, pageUrl);

    return NextResponse.json({ success: true, message: 'Session tracking disabled - return visitor module not available' });
  } catch (error: any) {
    console.error('Error tracking session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






