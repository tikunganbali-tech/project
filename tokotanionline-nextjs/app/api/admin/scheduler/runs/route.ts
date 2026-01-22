/**
 * FASE 4 — SCHEDULER RUNS API
 * 
 * GET /api/admin/scheduler/runs - Get scheduler run history
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/scheduler/runs
 * Get scheduler run history
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const runs = await prisma.schedulerRun.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        startedAt: 'desc',
      },
    });

    const total = await prisma.schedulerRun.count();

    return NextResponse.json({
      success: true,
      runs: runs.map((run) => ({
        ...run,
        log: run.log ? JSON.parse(run.log) : null,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULER-RUNS] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get runs',
      },
      { status: 500 }
    );
  }
}
