/**
 * PHASE UI-A: Scheduler Dashboard Status API
 * 
 * GET /api/admin/schedules/dashboard
 * Returns: Engine status, active schedules count, queue stats
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/schedules/dashboard
 * Get dashboard stats: engine status, active schedules, queue stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count active schedules
    const activeSchedules = await prisma.contentSchedule.count({
      where: { status: 'ACTIVE' },
    });

    // Get all keyword status counts
    const keywordStats = await prisma.scheduleKeyword.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const stats = {
      pending: 0,
      processing: 0,
      done: 0,
      failed: 0,
    };

    keywordStats.forEach(stat => {
      if (stat.status === 'PENDING') stats.pending = stat._count.status;
      else if (stat.status === 'PROCESSING') stats.processing = stat._count.status;
      else if (stat.status === 'DONE') stats.done = stat._count.status;
      else if (stat.status === 'FAILED') stats.failed = stat._count.status;
    });

    // Check engine status (simplified - we'll check if any schedule is ACTIVE)
    // In production, this would check actual engine health
    const engineStatus = activeSchedules > 0 ? 'RUNNING' : 'STOPPED';

    // Get recent activity (last 24 hours of keyword processing)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentDone = await prisma.scheduleKeyword.count({
      where: {
        status: 'DONE',
        updatedAt: { gte: oneDayAgo },
      },
    });

    const recentFailed = await prisma.scheduleKeyword.count({
      where: {
        status: 'FAILED',
        updatedAt: { gte: oneDayAgo },
      },
    });

    return NextResponse.json({
      success: true,
      dashboard: {
        engineStatus,
        activeSchedules,
        queue: {
          pending: stats.pending,
          processing: stats.processing,
          done: stats.done,
          failed: stats.failed,
        },
        recent24h: {
          done: recentDone,
          failed: recentFailed,
        },
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULES-DASHBOARD] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil status dashboard',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
