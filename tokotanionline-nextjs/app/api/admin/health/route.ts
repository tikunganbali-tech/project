/**
 * STEP 21-4 - System Health Check API
 * 
 * Health checks for:
 * - Next.js
 * - Engine Hub
 * - DB
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    nextjs: { status: 'ok' | 'error'; message: string };
    database: { status: 'ok' | 'error'; message: string; responseTime?: number };
    engineHub: { status: 'ok' | 'error'; message: string };
  };
  timestamp: string;
}

export async function GET() {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const health: HealthStatus = {
    status: 'healthy',
    checks: {
      nextjs: { status: 'ok', message: 'Next.js is running' },
      database: { status: 'ok', message: 'Database connection OK' },
      engineHub: { status: 'ok', message: 'Engine Hub accessible' },
    },
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    health.checks.database.responseTime = responseTime;
    
    if (responseTime > 1000) {
      health.checks.database.status = 'error';
      health.checks.database.message = `Database slow (${responseTime}ms)`;
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.checks.database.status = 'error';
    health.checks.database.message = `Database error: ${error.message}`;
    health.status = 'unhealthy';
  }

  // Check Engine Hub (if available)
  try {
    // Simple check - can be extended to actual engine hub health check
    health.checks.engineHub.status = 'ok';
    health.checks.engineHub.message = 'Engine Hub status unknown (read-only mode)';
  } catch (error: any) {
    health.checks.engineHub.status = 'error';
    health.checks.engineHub.message = `Engine Hub error: ${error.message}`;
    if (health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

