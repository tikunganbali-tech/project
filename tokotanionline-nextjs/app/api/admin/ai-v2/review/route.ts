/**
 * PHASE 4: Review Gate (Human-in-the-loop)
 * 
 * Admin tidak mengedit teks
 * Admin hanya:
 * - Menerima versi baru
 * - Publish / reject
 * 
 * Keputusan tercatat (audit trail)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, version, decision, reason } = body;

    if (!pageId || !version || !decision) {
      return NextResponse.json(
        { error: 'pageId, version, and decision are required' },
        { status: 400 }
      );
    }

    if (decision !== 'ACCEPT' && decision !== 'REJECT') {
      return NextResponse.json(
        { error: 'Decision must be ACCEPT or REJECT' },
        { status: 400 }
      );
    }

    // PHASE 4: Save admin decision (audit trail)
    const adminDecision = {
      decision,
      reason: reason || '',
      adminId: (session.user as any)?.id || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Save decision to engine-hub
    try {
      const decisionUrl = `${ENGINE_HUB_URL}/api/v2/qc/decision`;
      const decisionResponse = await fetch(decisionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          version,
          adminDecision,
        }),
      });

      if (!decisionResponse.ok) {
        console.error('[REVIEW] Failed to save decision:', await decisionResponse.text());
      }
    } catch (error: any) {
      console.error('[REVIEW] Error saving decision:', error);
      // Continue anyway - decision logging is non-blocking
    }

    // PHASE 4: If ACCEPT, publish the version
    if (decision === 'ACCEPT') {
      try {
        const publishUrl = `${ENGINE_HUB_URL}/api/v2/events/publish`;
        await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageId,
            version,
            pageType: 'blog', // TODO: Get from content
          }),
        });
      } catch (error: any) {
        console.error('[REVIEW] Error publishing:', error);
        // Continue anyway
      }
    }

    return NextResponse.json({
      success: true,
      decision: adminDecision,
      message: decision === 'ACCEPT' ? 'Version accepted and published' : 'Version rejected',
    });
  } catch (error: any) {
    console.error('[REVIEW] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
