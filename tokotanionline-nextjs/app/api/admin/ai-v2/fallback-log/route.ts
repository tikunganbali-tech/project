/**
 * PHASE 2: Fallback Logging
 * 
 * Log ketika fallback ke legacy content digunakan
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, event, timestamp } = body;

    // Log fallback usage
    console.warn('[FRONTEND FALLBACK]', {
      pageId,
      event: event || 'FRONTEND_FALLBACK_USED',
      timestamp: timestamp || new Date().toISOString(),
      userId: (session.user as any)?.id,
    });

    // TODO: Store in database or logging service
    // For now, just log to console

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FALLBACK LOG] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
