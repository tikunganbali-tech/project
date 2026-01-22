/**
 * FASE F5 — F5-B: PUBLIC SALES STATUS API
 * 
 * GET /api/public/sales-status
 * 
 * Fungsi: Public endpoint untuk check salesEnabled status
 * 
 * Response:
 * {
 *   salesEnabled: boolean
 * }
 */

import { NextResponse } from 'next/server';
import { getPublicSiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    const settings = await getPublicSiteSettings();
    
    return NextResponse.json(
      {
        salesEnabled: settings?.salesEnabled ?? false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('[public/sales-status] Error:', error);
    // Fail-safe: return false if error
    return NextResponse.json(
      { salesEnabled: false },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
