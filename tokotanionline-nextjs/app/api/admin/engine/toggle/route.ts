/**
 * ENGINE CONTROL CENTER - Toggle Engine API
 * 
 * POST /api/admin/engine/toggle - Toggle engine ON/OFF
 * Body: { engine: 'ai'|'seo'|'scheduler', status: 'ON'|'OFF', reason?: string }
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
    const { engine, status, reason } = body;

    if (!engine || !['ai', 'seo', 'scheduler'].includes(engine)) {
      return NextResponse.json(
        { error: 'Invalid engine. Must be: ai, seo, or scheduler' },
        { status: 400 }
      );
    }

    if (!status || !['ON', 'OFF'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: ON or OFF' },
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

    // Update the specific engine
    const updateData: any = {
      lastUpdatedAt: new Date(),
    };

    if (engine === 'ai') {
      updateData.aiEngineStatus = status;
      if (reason) updateData.aiEngineReason = reason;
    } else if (engine === 'seo') {
      updateData.seoEngineStatus = status;
      if (reason) updateData.seoEngineReason = reason;
    } else if (engine === 'scheduler') {
      updateData.schedulerStatus = status;
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
    console.error('[ENGINE-TOGGLE-API] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
