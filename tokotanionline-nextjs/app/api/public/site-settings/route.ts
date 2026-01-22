/**
 * PHASE 3.3.1 — PUBLIC SITE SETTINGS API (READ-ONLY)
 * GET /api/public/site-settings
 * 
 * Purpose: Public read-only API untuk website settings
 * - Tidak ada authentication required
 * - Hanya data yang diperlukan untuk public website
 * - Defensive: selalu return fallback jika gagal
 * - Cache-friendly (ISR)
 * 
 * Response:
 * {
 *   siteTitle: string | null,
 *   tagline: string | null,
 *   logoLight: string | null,
 *   logoDark: string | null,
 *   favicon: string | null,
 *   aboutContent: string | null,
 *   contactContent: string | null,
 *   footerText: string | null,
 * }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cache configuration: ISR with 300s revalidate
export const revalidate = 300;

export async function GET() {
  try {
    // Fetch site settings (defensive: catch all errors)
    const siteSettings = await prisma.siteSettings.findFirst({
      select: {
        siteTitle: true,
        tagline: true,
        logoLight: true,
        logoDark: true,
        favicon: true,
        aboutContent: true,
        contactContent: true,
        footerText: true,
      },
    }).catch(() => null);

    // Build response with fallbacks
    const response = {
      siteTitle: siteSettings?.siteTitle || null,
      tagline: siteSettings?.tagline || null,
      logoLight: siteSettings?.logoLight || null,
      logoDark: siteSettings?.logoDark || null,
      favicon: siteSettings?.favicon || null,
      aboutContent: siteSettings?.aboutContent || null,
      contactContent: siteSettings?.contactContent || null,
      footerText: siteSettings?.footerText || null,
    };

    // Return with cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('❌ [GET /api/public/site-settings] Error:', error);
    // Return 200 with null values, not 500 (defensive)
    return NextResponse.json(
      {
        siteTitle: null,
        tagline: null,
        logoLight: null,
        logoDark: null,
        favicon: null,
        aboutContent: null,
        contactContent: null,
        footerText: null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
