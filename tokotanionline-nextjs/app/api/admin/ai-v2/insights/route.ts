/**
 * PHASE 5: Dashboard Insight (Read-Only)
 * 
 * Admin bisa melihat:
 * - Histori versi
 * - Tren SEO
 * - Alasan revisi
 * 
 * Admin tidak mengedit teks
 * Admin hanya memutuskan publish
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const version = searchParams.get('version');

    if (!pageId) {
      return NextResponse.json(
        { error: 'pageId is required' },
        { status: 400 }
      );
    }

    // Fetch insights from engine-hub
    const apiUrl = version
      ? `${ENGINE_HUB_URL}/api/v2/insights/${pageId}/${version}`
      : `${ENGINE_HUB_URL}/api/v2/insights/${pageId}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch insights: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[INSIGHTS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
