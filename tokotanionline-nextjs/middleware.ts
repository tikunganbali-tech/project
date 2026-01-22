/**
 * E3.1 — VPS-FRIENDLY MIDDLEWARE (SERVER-FIRST AUTH GUARD)
 * 
 * KONTRAK TEKNIS WAJIB:
 * - Auth diselesaikan di middleware (PURE SERVER)
 * - Redirect server-side
 * - Protect /admin/:path* (exclude /admin/login)
 * - Exclude static, api, public
 * - Deterministic & minimal
 * - NO client-side auth, NO layout auth, NO page auth
 * 
 * NOTE: Middleware runs in Edge Runtime - cannot use NextAuth directly
 * Solution: Check for session cookie existence only, full auth happens in page/API
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// PHASE 10: HTTPS enforcement
import { enforceHTTPS } from '@/lib/https-enforcement';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // R5B-1: CRITICAL - Exclude static files FIRST (before ANY other logic)
  // This must be checked before anything else to prevent static asset redirects
  // Check for _next paths (including all subpaths like /_next/static, /_next/image, etc.)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|map)$/i)
  ) {
    return NextResponse.next();
  }

  // PHASE 10: Enforce HTTPS in production (after static files check)
  const httpsRedirect = enforceHTTPS(request);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  // H-FIX-3: Route consistency - Redirect /products → /produk (301 permanent)
  if (pathname === '/products' || pathname.startsWith('/products/')) {
    const redirectUrl = new URL(request.url);
    // Preserve query params
    request.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    
    if (pathname === '/products') {
      // Exact match: /products → /produk
      redirectUrl.pathname = '/produk';
    } else if (pathname.startsWith('/products/')) {
      // Path with slug: /products/[slug] → /produk/[slug]
      const slug = pathname.replace('/products', '/produk');
      redirectUrl.pathname = slug;
    }
    
    return NextResponse.redirect(redirectUrl, 301);
  }

  // R5B-1: Allow /admin/login - NO auth check, NO exceptions
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  // Protect /admin routes (except /admin/login which is already handled above)
  if (pathname.startsWith('/admin')) {
    // SECURITY: Always enforce auth check - NO dev mode bypass in middleware
    // Edge Runtime: Only check for session cookie existence
    // Full authentication happens in page/API routes (Node.js runtime)
    
    // Check both possible cookie names (development and production)
    const devCookieName = 'authjs.session-token';
    const prodCookieName = '__Secure-authjs.session-token';
    
    const devCookie = request.cookies.get(devCookieName);
    const prodCookie = request.cookies.get(prodCookieName);
    
    // Check if any session cookie exists AND has a value
    const hasValidCookie = (devCookie?.value && devCookie.value.length > 0) || 
                          (prodCookie?.value && prodCookie.value.length > 0);
    
    if (!hasValidCookie) {
      // No valid session cookie - redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      // Only set callbackUrl if not already going to login
      if (pathname !== '/admin/login') {
        loginUrl.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Valid session cookie exists - allow access (full auth validation happens in page)
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

/**
 * Middleware matcher - Precise matching for VPS compatibility
 * Match all paths except static files, API routes, and Next.js internals
 */
export const config = {
  matcher: [
    /*
     * R5B-1: Match all request paths except:
     * - _next/* (ALL Next.js internal paths - static, image, webpack, chunks, etc.)
     * - favicon.ico (favicon file)
     * - API routes (/api/*)
     * - Static assets (images, fonts, css, js, json, map, etc.)
     */
    '/((?!_next|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|map)).*)',
  ],
};
