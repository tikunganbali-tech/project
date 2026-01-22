/**
 * ENGINE CONTROL CENTER - Access Mode API
 * 
 * POST /api/admin/engine/access - Update access mode for roles
 * Body: { role: 'admin'|'editor', allow: boolean }
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    assertPermission(userRole, 'engine.control');

    const body = await request.json();
    const { role, allow } = body;

    if (!role || !['admin', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin or editor' },
        { status: 400 }
      );
    }

    if (typeof allow !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid allow. Must be boolean' },
        { status: 400 }
      );
    }

    // Get or create engine state
    let engineState = await prisma.engineState.findFirst();
    
    if (!engineState) {
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

    // Update access mode
    const updateData: any = {
      lastUpdatedAt: new Date(),
    };

    if (role === 'admin') {
      updateData.accessModeAdmin = allow;
    } else if (role === 'editor') {
      updateData.accessModeEditor = allow;
    }

    const updated = await prisma.engineState.update({
      where: { id: engineState.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      engine_state: {
        ai_engine: {
          status: updated.aiEngineStatus,
          reason: updated.aiEngineReason || undefined,
        },
        seo_engine: {
          status: updated.seoEngineStatus,
          reason: updated.seoEngineReason || undefined,
        },
        scheduler: {
          status: updated.schedulerStatus,
        },
        access_mode: {
          admin: updated.accessModeAdmin,
          editor: updated.accessModeEditor,
        },
        last_updated_at: updated.lastUpdatedAt,
      },
    });
  } catch (error: any) {
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Fitur ini belum aktif. Aktifkan di Engine Control.' },
        { status: 403 }
      );
    }
    console.error('[ENGINE-ACCESS-API] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
