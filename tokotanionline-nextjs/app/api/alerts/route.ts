/**
 * PHASE 10 - Alerting Endpoint
 * 
 * GET /api/alerts
 * 
 * Check system health and return alerts for:
 * - Service down
 * - Error spike
 * - High resource usage
 * - Database issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import os from 'os';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Alert {
  level: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  timestamp: string;
}

// Thresholds
const THRESHOLDS = {
  memoryUsagePercent: 90,
  cpuUsagePercent: 80,
  dbResponseTimeMs: 1000,
  errorRatePercent: 5,
};

/**
 * Check database health
 */
async function checkDatabase(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    if (responseTime > THRESHOLDS.dbResponseTimeMs) {
      alerts.push({
        level: 'warning',
        type: 'database_slow',
        message: `Database response time is high: ${responseTime}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    alerts.push({
      level: 'critical',
      type: 'database_down',
      message: `Database connection failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Check system resources
 */
function checkResources(): Alert[] {
  const alerts: Alert[] = [];

  // Memory check
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

  if (memUsagePercent > THRESHOLDS.memoryUsagePercent) {
    alerts.push({
      level: 'critical',
      type: 'high_memory',
      message: `Memory usage is high: ${memUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  } else if (memUsagePercent > THRESHOLDS.memoryUsagePercent - 10) {
    alerts.push({
      level: 'warning',
      type: 'high_memory',
      message: `Memory usage is elevated: ${memUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // CPU check
  const loadAvg = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpuUsagePercent = (loadAvg / cpuCount) * 100;

  if (cpuUsagePercent > THRESHOLDS.cpuUsagePercent) {
    alerts.push({
      level: 'warning',
      type: 'high_cpu',
      message: `CPU usage is high: ${cpuUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Check error rates (from audit log)
 */
async function checkErrorRates(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get error count from last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const errorCount = await prisma.auditLog.count({
      where: {
        action: {
          contains: 'ERROR',
        },
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    // Get total action count
    const totalCount = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (totalCount > 0) {
      const errorRate = (errorCount / totalCount) * 100;
      if (errorRate > THRESHOLDS.errorRatePercent) {
        alerts.push({
          level: 'critical',
          type: 'error_spike',
          message: `Error rate is high: ${errorRate.toFixed(1)}% (${errorCount} errors in last hour)`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error: any) {
    // Non-critical, just log
    console.error('[alerts] Error checking error rates:', error);
  }

  return alerts;
}

export async function GET(request: NextRequest) {
  try {
    const alerts: Alert[] = [];

    // Check database
    alerts.push(...await checkDatabase());

    // Check resources
    alerts.push(...checkResources());

    // Check error rates
    alerts.push(...await checkErrorRates());

    // Sort by level (critical first)
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    const statusCode = alerts.some(a => a.level === 'critical') ? 503 : 200;

    return NextResponse.json({
      alerts,
      count: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      timestamp: new Date().toISOString(),
    }, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[alerts] Error:', error);
    return NextResponse.json(
      {
        alerts: [{
          level: 'critical' as const,
          type: 'alert_system_error',
          message: `Alert system error: ${error.message}`,
          timestamp: new Date().toISOString(),
        }],
        error: 'Failed to check alerts',
      },
      { status: 500 }
    );
  }
}
