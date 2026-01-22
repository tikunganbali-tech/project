/**
 * UI-B1: Engine Status API
 * 
 * Returns engine status based on heartbeat (not assumptions)
 * - Engine Status: RUNNING / STOPPED
 * - Last Heartbeat (timestamp)
 * - Uptime (hh:mm)
 * - Scheduler Worker: ACTIVE / IDLE
 * - Queue Summary: Pending, Processing, Done (today), Failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get engine heartbeat
    const heartbeat = await prisma.engineHeartbeat.findUnique({
      where: { engineName: 'content-engine' },
    });

    // Determine engine status based on heartbeat
    // If no heartbeat or last beat > 60 seconds ago, consider STOPPED
    const now = new Date();
    const lastBeatAt = heartbeat?.lastBeatAt || null;
    const heartbeatThreshold = 60 * 1000; // 60 seconds
    
    let engineStatus: 'RUNNING' | 'STOPPED' = 'STOPPED';
    if (heartbeat && lastBeatAt) {
      const timeSinceLastBeat = now.getTime() - lastBeatAt.getTime();
      engineStatus = timeSinceLastBeat < heartbeatThreshold ? 'RUNNING' : 'STOPPED';
    }

    // Calculate uptime
    let uptime: string = '00:00';
    if (heartbeat?.uptimeStart && engineStatus === 'RUNNING') {
      const uptimeMs = now.getTime() - heartbeat.uptimeStart.getTime();
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      uptime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Get scheduler worker status (check if there's a running job)
    const runningJob = await prisma.contentJob.findFirst({
      where: { status: 'RUNNING' },
    });
    const schedulerWorkerStatus: 'ACTIVE' | 'IDLE' = runningJob ? 'ACTIVE' : 'IDLE';

    // Get queue summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [pending, processing, doneToday, failed] = await Promise.all([
      prisma.contentJob.count({ where: { status: 'PENDING' } }),
      prisma.contentJob.count({ where: { status: 'RUNNING' } }),
      prisma.contentJob.count({
        where: {
          status: 'DONE',
          finishedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.contentJob.count({ where: { status: 'FAILED' } }),
    ]);

    // Get engine control (pause status)
    let engineControl = await prisma.engineControl.findFirst();
    if (!engineControl) {
      // Create default if doesn't exist
      engineControl = await prisma.engineControl.create({
        data: { paused: false },
      });
    }

    return NextResponse.json({
      engineStatus,
      lastHeartbeat: lastBeatAt?.toISOString() || null,
      uptime,
      schedulerWorker: schedulerWorkerStatus,
      queue: {
        pending,
        processing,
        done: doneToday,
        failed,
      },
      paused: engineControl.paused,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching engine status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch engine status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
