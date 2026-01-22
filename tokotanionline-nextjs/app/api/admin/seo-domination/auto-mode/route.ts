/**
 * SEO DOMINATION - Auto Mode Control API
 * Start/stop auto mode and get engine runtime status
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
// SEO engine auto-worker removed - non-core feature

// GET - Get auto mode status for all engines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all engine statuses
    const engineStatuses = await prisma.seoEngineStatus.findMany({
      orderBy: { engineName: 'asc' },
    });

    // SEO engine auto-worker removed - non-core feature
    return NextResponse.json({
      engines: engineStatuses.map(engine => ({
        ...engine,
        runtimeStatus: 'removed',
        isRunning: false,
        status: 'removed',
      })),
      autoWorkerActive: false,
      message: 'SEO engine auto-worker has been removed',
    });
  } catch (error: any) {
    console.error('Error getting auto mode status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Start/stop auto mode for engine or worker
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, engineName } = body;

    if (action === 'start_worker' || action === 'stop_worker') {
      return NextResponse.json({ 
        error: 'SEO engine auto-worker has been removed as part of core system refactoring' 
      }, { status: 410 });
    }

    if (action === 'start_engine' || action === 'stop_engine') {
      if (!engineName) {
        return NextResponse.json({ error: 'engineName required' }, { status: 400 });
      }

      const isEnabled = action === 'start_engine';

      await prisma.seoEngineStatus.update({
        where: { engineName },
        data: { isEnabled },
      });

      return NextResponse.json({
        success: true,
        message: `Engine ${engineName} ${isEnabled ? 'started' : 'stopped'}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error controlling auto mode:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}








