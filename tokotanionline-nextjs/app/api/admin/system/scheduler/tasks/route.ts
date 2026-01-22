/**
 * PHASE 6B — SCHEDULER TASKS API
 * 
 * GET: List all scheduler tasks
 * PUT: Update task configuration (interval, enabled)
 * 
 * Permission: SUPER ADMIN only
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/system/scheduler/tasks
 * List all scheduler tasks
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json({ error: 'Forbidden: SUPER ADMIN only' }, { status: 403 });
    }

    const tasks = await prisma.schedulerTask.findMany({
      orderBy: { taskKey: 'asc' },
      include: {
        runs: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/system/scheduler/tasks] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/system/scheduler/tasks
 * Update task configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json({ error: 'Forbidden: SUPER ADMIN only' }, { status: 403 });
    }

    const body = await req.json();
    const { taskId, enabled, intervalMinutes } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }
    if (intervalMinutes !== undefined) {
      if (intervalMinutes < 1 || intervalMinutes > 10080) {
        return NextResponse.json({ error: 'intervalMinutes must be between 1 and 10080 (1 week)' }, { status: 400 });
      }
      updateData.intervalMinutes = intervalMinutes;
      // Recalculate nextRunAt if interval changed
      const task = await prisma.schedulerTask.findUnique({ where: { id: taskId } });
      if (task && task.lastRunAt) {
        const nextRunAt = new Date(task.lastRunAt);
        nextRunAt.setMinutes(nextRunAt.getMinutes() + intervalMinutes);
        updateData.nextRunAt = nextRunAt;
      }
    }

    const updated = await prisma.schedulerTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      task: updated,
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/system/scheduler/tasks] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
