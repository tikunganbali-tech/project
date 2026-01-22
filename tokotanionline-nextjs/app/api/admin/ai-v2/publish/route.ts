/**
 * PHASE 3: Publish Engine = Event Distributor
 * 
 * Saat publish:
 * ❌ Jangan validasi isi
 * ❌ Jangan panggil SEO
 * ✅ Emit CONTENT_PUBLISHED
 * 
 * Publish tidak boleh gagal karena SEO/validator
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
    const { pageId, version, pageType } = body;

    if (!pageId || !version) {
      return NextResponse.json(
        { error: 'pageId and version are required' },
        { status: 400 }
      );
    }

    // PHASE 3: Publish tanpa validasi isi
    // PHASE 3: Publish tanpa panggil SEO
    // PHASE 3: Hanya emit event

    // Emit CONTENT_PUBLISHED event ke engine-hub
    try {
      const eventUrl = `${ENGINE_HUB_URL}/api/v2/events/publish`;
      const eventResponse = await fetch(eventUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          version,
          pageType: pageType || 'blog',
        }),
      });

      if (!eventResponse.ok) {
        console.error('[PUBLISH] Failed to emit event:', await eventResponse.text());
        // PHASE 3: Publish tidak boleh gagal karena event emission
        // Continue anyway
      } else {
        console.log('[PUBLISH] Event CONTENT_PUBLISHED emitted:', { pageId, version });
      }
    } catch (error: any) {
      console.error('[PUBLISH] Error emitting event:', error);
      // PHASE 3: Publish tidak boleh gagal karena event emission
      // Continue anyway
    }

    // PHASE 3: Publish selalu sukses (tidak ada validasi yang memblokir)
    return NextResponse.json({
      success: true,
      pageId,
      version,
      publishedAt: new Date().toISOString(),
      message: 'Content published successfully',
    });
  } catch (error: any) {
    console.error('[PUBLISH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
