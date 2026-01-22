/**
 * FASE 2 — ENGINE STATUS ENDPOINT
 * 
 * GET /api/engine/status
 * 
 * Response ringan & stabil:
 * - Selalu return 200
 * - Tidak pernah throw
 * - Tidak ada DB berat
 * - Tidak ada AI
 * - Tidak ada side-effect
 */

import { NextResponse } from 'next/server';
import { getEngineStatus } from '@/lib/engine-storage';
import { error as logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getEngineStatus();
    
    return NextResponse.json(status, { status: 200 });
  } catch (err: any) {
    // Fail-safe: return default status even on error
    // Log error for debugging (VPS-friendly)
    logError('[ENGINE-STATUS] Failed to get engine status', {
      error: err.message,
      stack: err.stack,
    });
    
    return NextResponse.json(
      {
        state: 'idle',
        lastRunAt: null,
        message: 'Engine ready',
      },
      { status: 200 }
    );
  }
}
