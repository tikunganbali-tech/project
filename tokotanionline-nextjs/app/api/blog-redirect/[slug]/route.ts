/**
 * BLOG REDIRECT HANDLER
 * Handles 301 redirects from old numeric URLs to new semantic slugs
 */

import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Engine module not available
// import { getRedirectUrl } from '@/lib/seo/redirect-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  // DISABLED: Redirect engine not available - just pass through
  // Check if this is a redirect
  // const redirectUrl = await getRedirectUrl(slug);

  // if (redirectUrl) {
  //   // Return 301 permanent redirect
  //   return NextResponse.redirect(new URL(redirectUrl, request.url), {
  //     status: 301,
  //     headers: {
  //       'Cache-Control': 'public, max-age=31536000, immutable',
  //     },
  //   });
  // }

  // No redirect found - let Next.js handle normally
  // This will fall through to the blog detail page
  return NextResponse.next();
}

















