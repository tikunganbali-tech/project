/**
 * STEP 24C — SYSTEM SETTINGS (GLOBAL CONFIG & SAFETY)
 * 
 * GET /api/admin/system/settings
 * PUT /api/admin/system/settings
 * 
 * Fungsi: Manage system-wide settings (flags, config)
 * 
 * Prinsip:
 * - Config-only (no engine execution)
 * - FEATURE_FREEZE respected
 * - Role-based access
 * - Audit trail untuk semua perubahan
 * 
 * Kategori:
 * - System Flags: SAFE_MODE (read-only), FEATURE_FREEZE (super_admin only)
 * - Content: Default publish mode (draft-only)
 * - Marketing: Event logging ON/OFF (read-only display)
 * - Security: Session max age (read-only display)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission, isSuperAdmin } from '@/lib/permissions';
import { FEATURE_FREEZE, SAFE_MODE } from '@/lib/admin-config';
import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';

/**
 * GET /api/admin/system/settings
 * 
 * Fungsi: Get system settings (read-only display)
 * 
 * Guard:
 * - Auth required
 * - Permission: system.view
 */
export async function GET() {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    let session;
    try {
      session = await getServerSession();
    } catch (authError: any) {
      logError('Error getting server session:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: process.env.NODE_ENV === 'development' ? authError.message : undefined },
        { status: 500 }
      );
    }
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any)?.role;
    if (!userRole) {
      logError('User role not found in session');
      return NextResponse.json(
        { error: 'Invalid session: role not found' },
        { status: 500 }
      );
    }

    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      logError('Permission check error:', error);
      throw error;
    }

    // 📥 GET SETTINGS
    // Note: SAFE_MODE dan FEATURE_FREEZE diambil dari lib/admin-config.ts (source of truth)
    // Feature flags (salesEnabled, phaseFSocialProofEnabled) dari SiteSettings database
    
    // Fetch SiteSettings untuk feature flags
    let siteSettings;
    try {
      siteSettings = await prisma.siteSettings.findFirst();
    } catch (dbError: any) {
      logError('Error fetching SiteSettings:', dbError);
      // Continue with null siteSettings (use defaults)
      siteSettings = null;
    }
    
    const settings = {
      // System Flags (read-only di UI untuk SAFE_MODE)
      systemFlags: {
        safeMode: SAFE_MODE, // Read-only (dari config file)
        featureFreeze: FEATURE_FREEZE, // Read-only untuk non-super_admin
      },
      
      // Sales Feature Toggles (F5-B)
      sales: {
        salesEnabled: siteSettings?.salesEnabled ?? false,
        phaseFSocialProofEnabled: siteSettings?.phaseFSocialProofEnabled ?? false,
      },
      
      // Content Settings
      content: {
        defaultPublishMode: 'draft', // Always draft-only (safety)
      },
      
      // Marketing Settings (read-only display)
      marketing: {
        eventLoggingEnabled: true, // Read-only (always enabled)
      },
      
      // Security Settings (read-only display)
      security: {
        sessionMaxAge: '8 hours', // Read-only display
        sessionMaxAgeLong: '30 days', // Read-only display
      },
    };

    return NextResponse.json({
      success: true,
      settings,
      // Metadata
      canModify: isSuperAdmin(userRole) && !FEATURE_FREEZE,
      isSuperAdmin: isSuperAdmin(userRole),
    });

  } catch (error: any) {
    logError('Error fetching system settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/system/settings
 * 
 * Fungsi: Update system settings
 * 
 * Guard:
 * - Permission: system.write
 * - Requester HARUS super_admin
 * - FEATURE_FREEZE check
 * 
 * Rules:
 * - Hanya FEATURE_FREEZE yang bisa diubah (super_admin only)
 * - SAFE_MODE tidak bisa diubah via API (harus edit file)
 * - Audit trail untuk semua perubahan
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
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || (session.user as any).email || 'Unknown';
    
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

    // 🔒 GUARD 3: SUPER_ADMIN CHECK
    // Hanya super_admin yang bisa modify system settings
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can modify system settings' },
        { status: 403 }
      );
    }

    // 🔒 GUARD 4: FEATURE_FREEZE CHECK
    // Jika FEATURE_FREEZE aktif, tidak bisa modify (kecuali untuk disable FEATURE_FREEZE sendiri)
    const body = await req.json();
    const { featureFreeze, salesEnabled, phaseFSocialProofEnabled } = body;

    // Allow modify FEATURE_FREEZE even if it's currently true (to disable it)
    // But block other modifications if FEATURE_FREEZE is true
    if (FEATURE_FREEZE && featureFreeze === undefined && salesEnabled === undefined && phaseFSocialProofEnabled === undefined) {
      return NextResponse.json(
        { error: 'Forbidden: System is in feature freeze mode. Only FEATURE_FREEZE can be modified.' },
        { status: 403 }
      );
    }

    // ✅ VALIDATION
    // Validate featureFreeze
    if (featureFreeze !== undefined && typeof featureFreeze !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid featureFreeze value. Must be boolean.' },
        { status: 400 }
      );
    }

    // Validate salesEnabled (F5-B)
    if (salesEnabled !== undefined && typeof salesEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid salesEnabled value. Must be boolean.' },
        { status: 400 }
      );
    }

    // Validate phaseFSocialProofEnabled (F5-B)
    if (phaseFSocialProofEnabled !== undefined && typeof phaseFSocialProofEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid phaseFSocialProofEnabled value. Must be boolean.' },
        { status: 400 }
      );
    }

    // ❌ SAFE_MODE tidak bisa diubah via API
    if (body.safeMode !== undefined) {
      return NextResponse.json(
        { error: 'SAFE_MODE cannot be modified via API. Please edit lib/admin-config.ts directly.' },
        { status: 400 }
      );
    }

    // 📝 UPDATE SETTINGS
    const changes: string[] = [];
    
    // Update FEATURE_FREEZE (file-based, log only)
    if (featureFreeze !== undefined && featureFreeze !== FEATURE_FREEZE) {
      changes.push(`FEATURE_FREEZE: ${FEATURE_FREEZE} → ${featureFreeze}`);
      
      // 📝 AUDIT TRAIL
      try {
        await prisma.eventLog.create({
          data: {
            event: 'system_settings_change',
            url: '/admin/system/settings',
            meta: {
              setting: 'FEATURE_FREEZE',
              oldValue: FEATURE_FREEZE,
              newValue: featureFreeze,
              changedBy: userName,
              changedById: userId,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (auditError) {
        logError('Error logging settings change:', auditError);
      }
    }

    // Update salesEnabled & phaseFSocialProofEnabled (F5-B) - database-based
    if (salesEnabled !== undefined || phaseFSocialProofEnabled !== undefined) {
      // Get current SiteSettings
      const currentSiteSettings = await prisma.siteSettings.findFirst();
      
      const updateData: any = {};
      if (salesEnabled !== undefined) {
        const oldValue = currentSiteSettings?.salesEnabled ?? false;
        if (salesEnabled !== oldValue) {
          updateData.salesEnabled = salesEnabled;
          changes.push(`salesEnabled: ${oldValue} → ${salesEnabled}`);
        }
      }
      
      if (phaseFSocialProofEnabled !== undefined) {
        const oldValue = currentSiteSettings?.phaseFSocialProofEnabled ?? false;
        if (phaseFSocialProofEnabled !== oldValue) {
          updateData.phaseFSocialProofEnabled = phaseFSocialProofEnabled;
          changes.push(`phaseFSocialProofEnabled: ${oldValue} → ${phaseFSocialProofEnabled}`);
        }
      }

      // Upsert SiteSettings
      if (Object.keys(updateData).length > 0) {
        if (currentSiteSettings) {
          await prisma.siteSettings.update({
            where: { id: currentSiteSettings.id },
            data: updateData,
          });
        } else {
          // Create if not exists
          await prisma.siteSettings.create({
            data: {
              ...updateData,
              siteTitle: 'Tokotanionline',
            },
          });
        }

        // 📝 AUDIT TRAIL
        try {
          await prisma.eventLog.create({
            data: {
              event: 'system_settings_change',
              url: '/admin/system/settings',
              meta: {
                settings: updateData,
                changedBy: userName,
                changedById: userId,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (auditError) {
          logError('Error logging settings change:', auditError);
        }
      }
    }

    // Get updated SiteSettings for response
    const updatedSiteSettings = await prisma.siteSettings.findFirst();

    // 📝 RESPONSE
    return NextResponse.json({
      success: true,
      message: changes.length > 0
        ? `Settings updated. ${featureFreeze !== undefined ? 'Note: FEATURE_FREEZE requires code deployment. ' : ''}Changes: ${changes.join(', ')}`
        : 'No changes detected',
      changes,
      warning: featureFreeze !== undefined ? 'FEATURE_FREEZE is file-based. Please update lib/admin-config.ts and redeploy.' : undefined,
      currentSettings: {
        safeMode: SAFE_MODE,
        featureFreeze: featureFreeze !== undefined ? featureFreeze : FEATURE_FREEZE,
        salesEnabled: updatedSiteSettings?.salesEnabled ?? false,
        phaseFSocialProofEnabled: updatedSiteSettings?.phaseFSocialProofEnabled ?? false,
      },
    });

  } catch (error: any) {
    logError('Error updating system settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
