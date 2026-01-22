/**
 * PHASE 2: Content Integrity Check
 * 
 * Log ketika hash server != hash DOM
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
    const { pageId, version, serverHash, domHash, valid } = body;

    if (!valid) {
      // Log integrity failure
      console.error('[CONTENT INTEGRITY FAILED]', {
        pageId,
        version,
        serverHash,
        domHash,
        timestamp: new Date().toISOString(),
        userId: (session.user as any)?.id,
      });

      // TODO: Store in database or alerting service
      // For now, just log to console
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[INTEGRITY CHECK] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
