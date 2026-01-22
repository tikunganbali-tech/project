/**
 * ENGINE MONITORING API
 * 
 * GET /api/admin/engines/monitor
 * - Timeline of engine activity
 * - Last success/failure
 * - Auto-fix applied or not
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const engineName = searchParams.get('engineName');
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');

    const dateFrom = new Date();
    dateFrom.setHours(dateFrom.getHours() - hours);

    // Get engine health
    const healthWhere: any = {};
    if (engineName) {
      healthWhere.engineName = engineName;
    }

    const engineHealth = engineName
      ? await prisma.engineHealth.findUnique({
          where: { engineName },
        })
      : await prisma.engineHealth.findMany({
          where: healthWhere,
          orderBy: { engineName: 'asc' },
        });

    // Get engine logs (timeline)
    const logsWhere: any = {
      executedAt: { gte: dateFrom },
    };
    if (engineName) {
      logsWhere.engineName = engineName;
    }

    const logs = await prisma.engineLog.findMany({
      where: logsWhere,
      orderBy: { executedAt: 'desc' },
      take: limit,
    });

    // Get active alerts
    const alertsWhere: any = {
      status: 'active',
    };
    if (engineName) {
      alertsWhere.engineName = engineName;
    }

    const alerts = await prisma.engineAlert.findMany({
      where: alertsWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Build timeline
    const timeline = logs.map(log => ({
      id: log.id,
      engineName: log.engineName,
      moduleName: log.moduleName,
      actionType: log.actionType,
      status: log.status,
      message: log.message,
      error: log.error,
      executionTime: log.executionTime,
      dataProcessedCount: log.dataProcessedCount,
      executedAt: log.executedAt,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    // Build engine summary
    const engines = Array.isArray(engineHealth) 
      ? engineHealth.filter((e): e is NonNullable<typeof e> => e !== null)
      : engineHealth 
        ? [engineHealth] 
        : [];
    const engineSummary = engines.map(engine => {
      const engineLogs = logs.filter(l => l.engineName === engine.engineName);
      const lastSuccess = engineLogs.find(l => l.status === 'RUN');
      const lastFailure = engineLogs.find(l => l.status === 'ERROR');
      const engineAlerts = alerts.filter(a => a.engineName === engine.engineName);

      return {
        id: engine.id,
        engineName: engine.engineName,
        status: engine.status,
        isActive: engine.isActive,
        lastRunAt: engine.lastRunAt,
        lastSuccessAt: engine.lastSuccessAt || lastSuccess?.executedAt,
        lastFailureAt: engine.lastFailureAt || lastFailure?.executedAt,
        lastError: engine.lastError,
        lastResult: engine.lastResult,
        lastDataProcessed: engine.lastDataProcessed,
        successCount: engine.successCount,
        warningCount: engine.warningCount,
        failureCount: engine.failureCount,
        errorRate: engine.errorRate,
        avgExecutionTime: engine.avgExecutionTime,
        totalDataProcessed: engine.totalDataProcessed,
        // Auto-fix tracking
        autoFixApplied: engine.autoFixApplied || false,
        lastAutoFixAt: engine.lastAutoFixAt,
        autoFixCount: engine.autoFixCount || 0,
        lastAutoFixType: engine.lastAutoFixType,
        autoFixSuccess: engine.autoFixSuccess,
        // Recent activity
        recentLogsCount: engineLogs.length,
        activeAlertsCount: engineAlerts.length,
        activeAlerts: engineAlerts.map(a => ({
          id: a.id,
          alertType: a.alertType,
          title: a.title,
          message: a.message,
          createdAt: a.createdAt,
        })),
      };
    });

    // Build summary
    const summary = {
      totalEngines: engines.length,
      healthyEngines: engines.filter(e => e.status === 'healthy').length,
      warningEngines: engines.filter(e => e.status === 'warning').length,
      criticalEngines: engines.filter(e => e.status === 'critical').length,
      activeAlerts: alerts.length,
      totalLogs: logs.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        engines: engineSummary,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting engine monitor data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get engine monitor data' },
      { status: 500 }
    );
  }
}

