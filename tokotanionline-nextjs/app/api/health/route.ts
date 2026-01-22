/**
 * PHASE FINAL — Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Purpose: Deterministic health check untuk observability
 * - Status dasar (up/down)
 * - Versi aplikasi
 * - Critical ENV variables check (FAIL if missing)
 * - Database connection status (optional, non-blocking)
 * 
 * Prinsip:
 * - Lightweight (no heavy queries)
 * - Deterministic (fails if critical ENV missing)
 * - Read-only (no mutations)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'up' | 'down';
  version: string;
  timestamp: string;
  env?: {
    critical: 'ok' | 'missing';
    missing?: string[];
  };
  checks?: {
    database?: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    engineHub?: {
      status: 'up' | 'down' | 'unknown';
      engines?: Record<string, string>;
    };
  };
}

// PHASE FINAL: Critical ENV vars that must exist
const CRITICAL_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const;

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'up',
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
  };

  // PHASE FINAL: Check critical ENV variables (FAIL FAST)
  const missingEnv: string[] = [];
  for (const envVar of CRITICAL_ENV_VARS) {
    if (!process.env[envVar]) {
      missingEnv.push(envVar);
    }
  }

  if (missingEnv.length > 0) {
    // PHASE FINAL: Healthcheck FAIL jika ENV kritikal hilang
    health.status = 'down';
    health.env = {
      critical: 'missing',
      missing: missingEnv,
    };
    console.error('[health] CRITICAL ENV variables missing:', missingEnv);
    
    return NextResponse.json(health, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }

  // ENV OK
  health.env = {
    critical: 'ok',
  };

  // Optional: Check database connection (non-blocking)
  try {
    const dbStartTime = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      ),
    ]);
    const dbResponseTime = Date.now() - dbStartTime;
    
    health.checks = {
      database: {
        status: 'up',
        responseTime: dbResponseTime,
      },
    };
  } catch (error: any) {
    // Non-blocking: health endpoint tetap return up meski DB down
    health.checks = {
      database: {
        status: 'down',
      },
    };
    // Log error but don't fail health check
    console.error('[health] Database check failed:', error?.message || error);
  }

  // FASE 7.3: Check engine hub state (non-blocking)
  try {
    const engineHubUrl = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
    const engineStartTime = Date.now();
    
    const engineResponse = await Promise.race([
      // NOTE: Engine Hub /health is intentionally minimal ({"status":"ok"}).
      // Use /health/full for extended payload (including engines map).
      fetch(`${engineHubUrl}/health/full`, { 
        signal: AbortSignal.timeout(2000),
        headers: { 'Accept': 'application/json' }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Engine hub timeout')), 2000)
      ),
    ]) as Response;
    
    if (engineResponse.ok) {
      const engineData = await engineResponse.json();
      const engineResponseTime = Date.now() - engineStartTime;
      
      health.checks = health.checks || {};
      health.checks.engineHub = {
        status: 'up',
        engines: engineData.engines || {},
      };
    } else {
      health.checks = health.checks || {};
      health.checks.engineHub = {
        status: 'down',
      };
    }
  } catch (error: any) {
    // Non-blocking: engine hub check failure doesn't fail health endpoint
    health.checks = health.checks || {};
    health.checks.engineHub = {
      status: 'unknown',
    };
    console.error('[health] Engine hub check failed:', error?.message || error);
  }

  const statusCode = health.status === 'up' ? 200 : 503;
  
  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
