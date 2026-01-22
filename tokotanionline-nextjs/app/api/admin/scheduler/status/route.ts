/**
 * FASE 4 — SCHEDULER STATUS API
 * 
 * GET /api/admin/scheduler/status - Get scheduler status and recent runs
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/scheduler/status
 * Get scheduler status, last run, today's count, etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get config
    const config = await prisma.schedulerConfig.findFirst();
    if (!config) {
      return NextResponse.json({
        success: true,
        status: {
          enabled: false,
          lastRun: null,
          todayCount: 0,
          status: 'idle',
          message: 'Scheduler not configured',
        },
      });
    }

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Count today's runs
    const todayRuns = await prisma.schedulerRun.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Get last run (any date)
    const lastRun = await prisma.schedulerRun.findFirst({
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Check if currently running
    const runningRun = await prisma.schedulerRun.findFirst({
      where: {
        status: 'running',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const status = runningRun ? 'running' : config.enabled ? 'idle' : 'disabled';

    // Count today's executed content
    const todayExecuted = todayRuns.reduce((sum, run) => sum + run.executedCount, 0);

    return NextResponse.json({
      success: true,
      status: {
        enabled: config.enabled,
        lastRun: lastRun
          ? {
              runId: lastRun.runId,
              date: lastRun.date,
              status: lastRun.status,
              executedCount: lastRun.executedCount,
              plannedCount: lastRun.plannedCount,
              startedAt: lastRun.startedAt,
              finishedAt: lastRun.finishedAt,
            }
          : null,
        todayCount: todayExecuted,
        todayRuns: todayRuns.length,
        quota: config.dailyQuota,
        quotaRemaining: Math.max(0, config.dailyQuota - todayExecuted),
        status,
        message: runningRun
          ? 'Scheduler is currently running'
          : config.enabled
          ? 'Scheduler is enabled and waiting'
          : 'Scheduler is disabled',
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULER-STATUS] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
