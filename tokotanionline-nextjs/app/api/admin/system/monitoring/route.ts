/**
 * PHASE 6B — SYSTEM MONITORING API
 * 
 * GET: Get system monitoring data (read-only)
 * - Integration status
 * - Scheduler status
 * - Active alerts
 * 
 * Permission: system.view
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/system/monitoring
 * Get system monitoring data
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    assertPermission(userRole, 'system.view');

    // Get integrations status
    const integrations = await prisma.systemIntegrationConfig.findMany({
      orderBy: { integrationId: 'asc' },
    });

    // Get scheduler tasks status
    const tasks = await prisma.schedulerTask.findMany({
      orderBy: { taskKey: 'asc' },
      include: {
        runs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    // Get active alerts
    const alerts = await prisma.systemAlert.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // Calculate scheduler summary
    const schedulerSummary = {
      totalTasks: tasks.length,
      enabledTasks: tasks.filter((t) => t.enabled).length,
      runningTasks: tasks.filter((t) => t.status === 'running').length,
      failedTasks: tasks.filter((t) => t.status === 'failed').length,
    };

    // Calculate integration summary
    const integrationSummary = {
      total: integrations.length,
      enabled: integrations.filter((i) => i.isEnabled).length,
      connected: integrations.filter((i) => i.healthStatus === 'CONNECTED').length,
      error: integrations.filter((i) => i.healthStatus === 'ERROR').length,
      notConfigured: integrations.filter((i) => i.healthStatus === 'NOT_CONFIGURED').length,
    };

    // Calculate alert summary
    const alertSummary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
      warning: alerts.filter((a) => a.severity === 'WARNING').length,
      info: alerts.filter((a) => a.severity === 'INFO').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        integrations: integrations.map((i) => ({
          id: i.integrationId,
          name: i.name,
          type: i.type,
          isEnabled: i.isEnabled,
          healthStatus: i.healthStatus,
          healthMessage: i.healthMessage,
          healthCheckedAt: i.healthCheckedAt?.toISOString(),
        })),
        scheduler: {
          tasks: tasks.map((t) => ({
            id: t.id,
            taskKey: t.taskKey,
            name: t.name,
            enabled: t.enabled,
            intervalMinutes: t.intervalMinutes,
            status: t.status,
            lastRunAt: t.lastRunAt?.toISOString(),
            nextRunAt: t.nextRunAt?.toISOString(),
            runCount: t.runCount,
            successCount: t.successCount,
            failureCount: t.failureCount,
            lastError: t.lastError,
            lastRun: t.runs[0] ? {
              status: t.runs[0].status,
              startedAt: t.runs[0].startedAt.toISOString(),
              finishedAt: t.runs[0].finishedAt?.toISOString(),
              durationMs: t.runs[0].durationMs,
              error: t.runs[0].error,
            } : null,
          })),
          summary: schedulerSummary,
        },
        alerts: alerts.map((a) => ({
          id: a.id,
          alertKey: a.alertKey,
          title: a.title,
          message: a.message,
          severity: a.severity,
          sourceType: a.sourceType,
          sourceId: a.sourceId,
          createdAt: a.createdAt.toISOString(),
        })),
        summary: {
          integrations: integrationSummary,
          scheduler: schedulerSummary,
          alerts: alertSummary,
        },
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/system/monitoring] Error:', error);
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
