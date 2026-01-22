/**
 * API: Get scroll-based internal links
 * PHASE 1: Traffic Ignition
 */

import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Traffic ignition module not available
// import { getScrollBasedLinks } from '@/lib/traffic-ignition';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType') as 'blog' | 'product';
    const pageId = searchParams.get('pageId');
    const scrollDepth = parseInt(searchParams.get('scrollDepth') || '0');

    if (!pageType || !pageId) {
      return NextResponse.json({ error: 'Missing pageType or pageId' }, { status: 400 });
    }

    // DISABLED: Traffic ignition module not available
    // const links = await getScrollBasedLinks(pageType, pageId, scrollDepth);

    return NextResponse.json({ links: [], message: 'Scroll-based links disabled - traffic ignition module not available' });
  } catch (error: any) {
    console.error('Error getting scroll-based links:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






