/**
 * PHASE G — Readiness Check Endpoint
 * 
 * GET /api/ready
 * 
 * Purpose: Readiness check untuk Kubernetes/load balancer
 * - Database connection (WAJIB)
 * - Disk writable (media directory) (WAJIB)
 * - Critical ENV vars present (WAJIB)
 * - Scheduler alive (optional, non-blocking)
 * 
 * Prinsip:
 * - Fail-fast: Jika critical check gagal → return 503
 * - Lightweight: Timeout per check (max 2s)
 * - Deterministic: Tidak ada race condition
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'fail';
      responseTime?: number;
    };
    disk: {
      status: 'ok' | 'fail';
      path?: string;
    };
    env: {
      status: 'ok' | 'fail';
      missing?: string[];
    };
    scheduler?: {
      status: 'ok' | 'fail' | 'unknown';
    };
  };
}

// PHASE G: Critical ENV vars that must exist
const CRITICAL_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const;

export async function GET() {
  const readiness: ReadinessStatus = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'fail' },
      disk: { status: 'fail' },
      env: { status: 'fail' },
    },
  };

  let allChecksPassed = true;

  // PHASE G: Check 1 - Critical ENV variables (WAJIB)
  const missingEnv: string[] = [];
  for (const envVar of CRITICAL_ENV_VARS) {
    if (!process.env[envVar]) {
      missingEnv.push(envVar);
    }
  }

  if (missingEnv.length > 0) {
    readiness.checks.env = {
      status: 'fail',
      missing: missingEnv,
    };
    allChecksPassed = false;
    console.error('[ready] CRITICAL ENV variables missing:', missingEnv);
  } else {
    readiness.checks.env = {
      status: 'ok',
    };
  }

  // PHASE G: Check 2 - Database connection (WAJIB)
  try {
    const dbStartTime = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      ),
    ]);
    const dbResponseTime = Date.now() - dbStartTime;
    
    readiness.checks.database = {
      status: 'ok',
      responseTime: dbResponseTime,
    };
  } catch (error: any) {
    readiness.checks.database = {
      status: 'fail',
    };
    allChecksPassed = false;
    console.error('[ready] Database check failed:', error?.message || error);
  }

  // PHASE G: Check 3 - Disk writable (media directory) (WAJIB)
  try {
    const mediaDir = path.join(process.cwd(), 'public', 'images');
    
    // Check if directory exists, create if not
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    // Test write permission
    const testFile = path.join(mediaDir, '.ready-check');
    fs.writeFileSync(testFile, 'ready');
    fs.unlinkSync(testFile); // Clean up test file
    
    readiness.checks.disk = {
      status: 'ok',
      path: mediaDir,
    };
  } catch (error: any) {
    readiness.checks.disk = {
      status: 'fail',
    };
    allChecksPassed = false;
    console.error('[ready] Disk check failed:', error?.message || error);
  }

  // PHASE G: Check 4 - Scheduler alive (optional, non-blocking)
  try {
    const engineHubUrl = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
    
    const engineResponse = await Promise.race([
      fetch(`${engineHubUrl}/health`, { 
        signal: AbortSignal.timeout(2000),
        headers: { 'Accept': 'application/json' }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Engine hub timeout')), 2000)
      ),
    ]) as Response;
    
    if (engineResponse.ok) {
      readiness.checks.scheduler = {
        status: 'ok',
      };
    } else {
      readiness.checks.scheduler = {
        status: 'fail',
      };
      // Non-blocking: scheduler failure doesn't fail readiness
    }
  } catch (error: any) {
    // Non-blocking: scheduler check failure doesn't fail readiness
    readiness.checks.scheduler = {
      status: 'unknown',
    };
    console.warn('[ready] Scheduler check failed (non-blocking):', error?.message || error);
  }

  // PHASE G: Set overall status
  readiness.status = allChecksPassed ? 'ready' : 'not_ready';
  const statusCode = allChecksPassed ? 200 : 503;
  
  return NextResponse.json(readiness, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
