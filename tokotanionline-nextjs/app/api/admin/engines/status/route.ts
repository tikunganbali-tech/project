/**
 * Engine Status API
 * Get engine health status, last run, and results
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getEngineHealth, getEngineLogs } from '@/lib/engine-logger';

// GET - Get engine status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('engineName');

    // Get engine health
    const health = engineName
      ? await getEngineHealth(engineName as any)
      : await getEngineHealth();

    // Get recent logs for each engine
    if (engineName) {
      // Single engine
      const logs = await getEngineLogs({
        engineName: engineName as any,
        limit: 10,
      });

      return NextResponse.json({
        engine: health,
        recentLogs: logs.logs,
      });
    } else {
      // All engines
      const allHealth = health as any[];
      const enginesWithLogs = await Promise.all(
        allHealth.map(async (h) => {
          const logs = await getEngineLogs({
            engineName: h.engineName as any,
            limit: 5,
          });
          return {
            ...h,
            recentLogs: logs.logs,
          };
        })
      );

      return NextResponse.json({
        engines: enginesWithLogs,
        total: enginesWithLogs.length,
        active: enginesWithLogs.filter((e) => e.isActive).length,
        healthy: enginesWithLogs.filter((e) => e.status === 'healthy').length,
        warning: enginesWithLogs.filter((e) => e.status === 'warning').length,
        critical: enginesWithLogs.filter((e) => e.status === 'critical').length,
      });
    }
  } catch (error: any) {
    console.error('Error getting engine status:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get engine status',
      },
      { status: 500 }
    );
  }
}
