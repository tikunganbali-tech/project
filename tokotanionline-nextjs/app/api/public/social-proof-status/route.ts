/**
 * F6-A — SOCIAL PROOF STATUS API
 * 
 * GET /api/public/social-proof-status
 * 
 * Fungsi: Public endpoint untuk check phaseFSocialProofEnabled status
 * 
 * Response:
 * {
 *   enabled: boolean
 * }
 */

import { NextResponse } from 'next/server';
import { getPublicSiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    const settings = await getPublicSiteSettings();
    
    return NextResponse.json(
      {
        enabled: settings?.phaseFSocialProofEnabled ?? false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('[public/social-proof-status] Error:', error);
    // Fail-safe: return false if error
    return NextResponse.json(
      { enabled: false },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
