/**
 * SEO DOMINATION - Dashboard Stats API
 * Get dashboard statistics and alerts
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// SEO engine command center removed - non-core feature
import { getEngineLogs } from '@/lib/engine-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('includeLogs') !== 'false';
    const logLimit = parseInt(searchParams.get('logLimit') || '50', 10);

    // SEO engine command center removed - non-core feature
    const dashboardData = {
      stats: {
        totalEngines: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
        totalLogs: 0,
      },
      alerts: [],
      recentLogs: [],
    };

    // Fetch recent logs if requested
    let logs: any[] = [];
    if (includeLogs) {
      try {
        const logsData = await getEngineLogs({ limit: logLimit });
        logs = logsData.logs.map((log: any) => ({
          id: log.id,
          engineName: log.engineName,
          taskName: log.moduleName || 'unknown',
          status: log.status === 'RUN' ? 'success' : log.status === 'ERROR' ? 'failed' : 'warning',
          message: log.message,
          executionTime: log.executionTime,
          createdAt: log.executedAt,
          error: log.error,
        }));
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }

    return NextResponse.json({
      success: true,
      stats: dashboardData.stats,
      alerts: dashboardData.alerts,
      logs: logs.length > 0 ? logs : dashboardData.recentLogs || [],
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
      stats: {
        totalEngines: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
        totalLogs: 0,
      },
      alerts: [],
      logs: [],
    }, { status: 500 });
  }
}

