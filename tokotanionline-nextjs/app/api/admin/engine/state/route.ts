/**
 * ENGINE CONTROL CENTER - API Endpoints
 * 
 * GET /api/admin/engine/state - Get current engine state
 * POST /api/admin/engine/toggle - Toggle engine ON/OFF
 * POST /api/admin/engine/access - Update access mode
 * 
 * Guards:
 * - Auth required
 * - Permission: engine.control (super_admin only)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission, normalizeRole } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/engine/state
 * 
 * Returns current engine state
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    assertPermission(userRole, 'engine.view');

    // Get or create engine state (singleton)
    let engineState = await prisma.engineState.findFirst();
    
    if (!engineState) {
      // Initialize default state
      engineState = await prisma.engineState.create({
        data: {
          aiEngineStatus: 'OFF',
          seoEngineStatus: 'OFF',
          schedulerStatus: 'OFF',
          accessModeAdmin: true,
          accessModeEditor: false,
        },
      });
    }

    return NextResponse.json({
      engine_state: {
        ai_engine: {
          status: engineState.aiEngineStatus,
          reason: engineState.aiEngineReason || undefined,
        },
        seo_engine: {
          status: engineState.seoEngineStatus,
          reason: engineState.seoEngineReason || undefined,
        },
        scheduler: {
          status: engineState.schedulerStatus,
        },
        access_mode: {
          admin: engineState.accessModeAdmin,
          editor: engineState.accessModeEditor,
        },
        last_updated_at: engineState.lastUpdatedAt,
      },
    });
  } catch (error: any) {
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Fitur ini belum aktif. Aktifkan di Engine Control.' },
        { status: 403 }
      );
    }
    console.error('[ENGINE-STATE-API] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

