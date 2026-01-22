/**
 * FASE 2 — JOB LIST ENDPOINT
 * 
 * GET /api/engine/jobs
 * 
 * Return list job nyata dari storage
 * Tidak kosong setelah run
 */

import { NextResponse } from 'next/server';
import { getEngineJobs } from '@/lib/engine-storage';
import { error as logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jobs = await getEngineJobs();
    
    // Return jobs in reverse chronological order (newest first)
    const sortedJobs = jobs.sort((a, b) => {
      const timeA = a.startedAt || a.finishedAt || '';
      const timeB = b.startedAt || b.finishedAt || '';
      return timeB.localeCompare(timeA);
    });
    
    return NextResponse.json(sortedJobs, { status: 200 });
  } catch (err: any) {
    logError('[ENGINE-JOBS] Failed to get engine jobs', {
      error: err.message,
      stack: err.stack,
    });
    
    // Fail-safe: return empty array
    return NextResponse.json([], { status: 200 });
  }
}
