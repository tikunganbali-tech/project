/**
 * FASE 2 — ENGINE RUN ENDPOINT (MANUAL TRIGGER)
 * 
 * POST /api/engine/run
 * 
 * Saat dipanggil:
 * - set status → running
 * - buat EngineJob baru
 * - jalankan dummy workload (sleep 2-5 detik)
 * - set status → done
 * - simpan log
 * 
 * Aturan keras:
 * - Tidak ada AI
 * - Tidak ada loop
 * - Tidak blocking server (async)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import {
  getEngineStatus,
  updateEngineStatus,
  addEngineJob,
  updateEngineJob,
} from '@/lib/engine-storage';
import { error as logError, info as logInfo } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Helper: sleep untuk dummy workload
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logError('[ENGINE-RUN] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if engine is already running
    const currentStatus = await getEngineStatus();
    if (currentStatus.state === 'running') {
      logInfo('[ENGINE-RUN] Engine already running, rejecting request');
      return NextResponse.json(
        { error: 'Engine is already running' },
        { status: 409 }
      );
    }

    // Set status to running
    await updateEngineStatus({
      state: 'running',
      message: 'Engine running...',
    });

    // Create new job
    const job = await addEngineJob({
      type: 'manual',
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      log: 'Engine run started',
    });

    logInfo('[ENGINE-RUN] Engine run started', { jobId: job.id });

    // Run dummy workload asynchronously (non-blocking)
    (async () => {
      try {
        // Dummy workload: sleep 2-5 seconds (random)
        const duration = 2000 + Math.random() * 3000; // 2-5 seconds
        logInfo('[ENGINE-RUN] Starting dummy workload', { duration: `${duration}ms` });
        await sleep(duration);

        // Update job to done
        await updateEngineJob(job.id, {
          status: 'done',
          finishedAt: new Date().toISOString(),
          log: 'Engine run completed successfully',
        });

        // Update status to idle
        await updateEngineStatus({
          state: 'idle',
          lastRunAt: new Date().toISOString(),
          message: 'Engine ready',
        });

        logInfo('[ENGINE-RUN] Engine run completed', { jobId: job.id });
      } catch (err: any) {
        logError('[ENGINE-RUN] Error in async workload', {
          jobId: job.id,
          error: err.message,
          stack: err.stack,
        });
        
        // Update job to failed
        await updateEngineJob(job.id, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          log: `Engine run failed: ${err.message || 'Unknown error'}`,
        });

        // Update status to error
        await updateEngineStatus({
          state: 'error',
          message: 'Engine run failed',
        });
      }
    })();

    // Return immediately (non-blocking)
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: 'Engine run started',
      },
      { status: 200 }
    );
  } catch (err: any) {
    logError('[ENGINE-RUN] Failed to start engine run', {
      error: err.message,
      stack: err.stack,
    });
    
    // Try to set status to error
    try {
      await updateEngineStatus({
        state: 'error',
        message: 'Engine run failed',
      });
    } catch (statusError) {
      // Ignore status update errors, but log them
      logError('[ENGINE-RUN] Failed to update status after error', {
        error: (statusError as any).message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to start engine run', details: err.message },
      { status: 500 }
    );
  }
}
