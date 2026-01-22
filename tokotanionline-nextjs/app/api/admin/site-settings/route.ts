/**
 * PHASE 3.3.1 — GLOBAL WEBSITE SETTINGS (ADMIN API)
 * 
 * GET /api/admin/site-settings - Get site settings (single row)
 * PUT /api/admin/site-settings - Update site settings (upsert single row)
 * 
 * Guards & Validasi:
 * - Auth required
 * - Permission: system.view (GET), system.manage (PUT)
 * - Single row enforcement (upsert pattern)
 * - No hardcode, all from database
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/site-settings
 * 
 * Fungsi: Get site settings (single row)
 * 
 * Guard:
 * - Auth required
 * - Permission: system.view
 * 
 * Response:
 * - Single SiteSettings row (create default if not exists)
 */
export async function GET() {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // 📥 FETCH SITE SETTINGS (single row)
    // If not exists, return default structure (frontend will create on first save)
    let settings;
    try {
      settings = await prisma.siteSettings.findFirst();
    } catch (dbError: any) {
      console.error('❌ [GET /api/admin/site-settings] DB query error:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      );
    }

    // If no settings exist, return default structure
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: null,
        message: 'No settings found. Create default settings on first save.',
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/site-settings] Unexpected error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.constructor?.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/site-settings
 * 
 * Fungsi: Update site settings (upsert single row)
 * 
 * Guard:
 * - Permission: system.manage
 * - Single row enforcement (delete all others if multiple exist)
 * 
 * Rules:
 * - Upsert pattern: update if exists, create if not
 * - Enforce single row (delete duplicates if any)
 * - All fields optional (partial update allowed)
 */
export async function PUT(req: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.manage');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // 📥 PARSE REQUEST
    let body: any = {};
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('❌ [PUT /api/admin/site-settings] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError.message },
        { status: 400 }
      );
    }

    // ✅ VALIDATION
    // All fields are optional (partial update allowed)
    // Sanitize: convert empty strings to null for optional fields
    const sanitizeField = (value: any): string | null => {
      if (value === undefined) return undefined as any;
      if (value === null || value === '') return null;
      return String(value).trim() || null;
    };

    // 🔍 CHECK EXISTING SETTINGS
    let existing;
    try {
      existing = await prisma.siteSettings.findFirst();
    } catch (dbError: any) {
      console.error('❌ [PUT /api/admin/site-settings] DB query error:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      );
    }

    // 🗑️ ENFORCE SINGLE ROW: Delete duplicates if any
    try {
      const allSettings = await prisma.siteSettings.findMany();
      if (allSettings.length > 1) {
        // Keep the first one, delete others
        const toKeep = allSettings[0].id;
        await prisma.siteSettings.deleteMany({
          where: {
            id: { not: toKeep },
          },
        });
        // Re-fetch existing after cleanup
        existing = await prisma.siteSettings.findFirst();
      }
    } catch (cleanupError: any) {
      console.error('❌ [PUT /api/admin/site-settings] Cleanup error:', cleanupError);
      // Continue anyway - not critical
    }

    // 📝 UPSERT SETTINGS
    const settingsData: any = {};

    // Website Identity (sanitize: empty string → null)
    if (body.siteTitle !== undefined) settingsData.siteTitle = sanitizeField(body.siteTitle);
    if (body.tagline !== undefined) settingsData.tagline = sanitizeField(body.tagline);
    if (body.logoLight !== undefined) settingsData.logoLight = sanitizeField(body.logoLight);
    if (body.logoDark !== undefined) settingsData.logoDark = sanitizeField(body.logoDark);
    if (body.favicon !== undefined) settingsData.favicon = sanitizeField(body.favicon);

    // Homepage Control
    if (body.heroTitle !== undefined) settingsData.heroTitle = sanitizeField(body.heroTitle);
    if (body.heroSubtitle !== undefined) settingsData.heroSubtitle = sanitizeField(body.heroSubtitle);
    if (body.showFeaturedProducts !== undefined) {
      settingsData.showFeaturedProducts = Boolean(body.showFeaturedProducts);
    }
    if (body.showLatestPosts !== undefined) {
      settingsData.showLatestPosts = Boolean(body.showLatestPosts);
    }

    // Static Pages
    if (body.aboutContent !== undefined) settingsData.aboutContent = sanitizeField(body.aboutContent);
    if (body.contactContent !== undefined) settingsData.contactContent = sanitizeField(body.contactContent);
    if (body.footerText !== undefined) settingsData.footerText = sanitizeField(body.footerText);

    // SEO Global Settings (PHASE 4.1)
    if (body.defaultMetaTitle !== undefined) settingsData.defaultMetaTitle = sanitizeField(body.defaultMetaTitle);
    if (body.defaultMetaDescription !== undefined) settingsData.defaultMetaDescription = sanitizeField(body.defaultMetaDescription);

    // Update or create
    let updatedSettings;
    try {
      if (existing) {
        updatedSettings = await prisma.siteSettings.update({
          where: { id: existing.id },
          data: settingsData,
        });
      } else {
        // Create with defaults - ensure all required fields with defaults are set
        updatedSettings = await prisma.siteSettings.create({
          data: {
            ...settingsData,
            // Required fields with defaults (from schema)
            primaryColor: '#16a34a', // Default from schema
            secondaryColor: '#15803d', // Default from schema
            fontFamily: 'Inter', // Default from schema
            heroEnabled: true, // Default from schema
            ctaEnabled: true, // Default from schema
            testimonialsEnabled: true, // Default from schema
            socialProofEnabled: true, // Default from schema
            // Phase 3.3.1 fields
            showFeaturedProducts: body.showFeaturedProducts !== undefined ? Boolean(body.showFeaturedProducts) : true,
            showLatestPosts: body.showLatestPosts !== undefined ? Boolean(body.showLatestPosts) : true,
          },
        });
      }
    } catch (upsertError: any) {
      console.error('❌ [PUT /api/admin/site-settings] Upsert error:', upsertError);
      console.error('❌ Settings data attempted:', JSON.stringify(settingsData, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to save settings', 
          details: upsertError.message,
          code: upsertError.code || 'UNKNOWN_ERROR'
        },
        { status: 500 }
      );
    }

    // 📝 AUDIT LOG: website_settings_updated (PHASE 4.1)
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Unknown';
    try {
      const changedFields = Object.keys(settingsData);
      await prisma.eventLog.create({
        data: {
          event: 'website_settings_updated',
          url: '/admin/system/website',
          meta: {
            changedFields: changedFields,
            actorId: userId,
            actorName: userName,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError: any) {
      // Silent fail - don't break main flow
      console.error('❌ [PUT /api/admin/site-settings] Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: existing ? 'Settings updated successfully' : 'Settings created successfully',
    });

  } catch (error: any) {
    console.error('❌ [PUT /api/admin/site-settings] Unexpected error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.constructor?.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}
