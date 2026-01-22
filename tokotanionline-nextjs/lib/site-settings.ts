/**
 * PHASE 3.3.1 — PUBLIC SITE SETTINGS READER
 * 
 * File: lib/site-settings.ts
 * 
 * Fungsi: Public reader untuk SiteSettings (READ-ONLY)
 * 
 * Prinsip:
 * - Tidak pakai cache dulu (simple, audit-friendly)
 * - Aman, simple, audit-friendly
 * - Server-side only
 * - Error handling: return null instead of throw (prevent 500 errors)
 */

import { prisma } from '@/lib/db';

export async function getPublicSiteSettings() {
  // CRITICAL: Never throw - always return null on error to prevent 500 errors
  // This ensures static assets (CSS/JS) are not affected by DB errors
  try {
    // Quick check if prisma is available
    if (!prisma) {
      console.warn('[getPublicSiteSettings] Prisma not available');
      return null;
    }

    // Add timeout to prevent hanging queries (3 seconds max)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[getPublicSiteSettings] Query timeout');
        resolve(null);
      }, 3000);
    });

    const queryPromise = prisma.siteSettings.findFirst().catch((err: any) => {
      console.error('[getPublicSiteSettings] Query error:', err?.message || err);
      return null;
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result;
  } catch (error: any) {
    // CRITICAL: Never throw error - return null to prevent 500 errors
    console.error('[getPublicSiteSettings] Error fetching settings:', error?.message || error);
    return null;
  }
}
