/**
 * PHASE 10 - HTTPS Enforcement
 * 
 * Middleware to enforce HTTPS in production
 * Redirects HTTP to HTTPS (301 permanent redirect)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Check if request is HTTPS
 */
export function isHTTPS(request: NextRequest): boolean {
  // Check X-Forwarded-Proto header (set by reverse proxy)
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'https') {
    return true;
  }

  // Check if URL is HTTPS
  return request.url.startsWith('https://');
}

/**
 * Enforce HTTPS (redirect HTTP to HTTPS)
 */
export function enforceHTTPS(request: NextRequest): NextResponse | null {
  // Only enforce in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // Skip if already HTTPS
  if (isHTTPS(request)) {
    return null;
  }

  // Skip for health checks and internal endpoints
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/metrics') ||
    pathname.startsWith('/_next')
  ) {
    return null;
  }

  // Redirect to HTTPS (301 permanent)
  const httpsUrl = request.url.replace('http://', 'https://');
  return NextResponse.redirect(httpsUrl, 301);
}
