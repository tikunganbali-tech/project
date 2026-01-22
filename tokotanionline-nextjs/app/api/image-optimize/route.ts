/**
 * Image Optimization API
 * 
 * Optimizes images on-the-fly with caching
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    const width = searchParams.get('w');
    const height = searchParams.get('h');
    const quality = searchParams.get('q') || '85';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    // Use Next.js Image Optimization
    // This will be handled by Next.js Image component automatically
    // This endpoint is for API-based optimization if needed

    // For now, return the original URL with cache headers
    const response = NextResponse.redirect(new URL(imageUrl, request.url));

    // Set cache headers
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to optimize image' },
      { status: 500 }
    );
  }
}













