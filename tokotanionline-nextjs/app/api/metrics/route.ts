/**
 * PHASE G — Basic Monitoring Metrics API
 * 
 * GET /api/metrics
 * 
 * Returns basic monitoring metrics:
 * - Request count
 * - Error rate (4xx/5xx)
 * - Latency p95
 * - Job success/fail
 * 
 * Permission: Internal only (no public access)
 */

import { NextResponse } from 'next/server';
import { getMetricsSummary } from '@/lib/basic-monitoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const metrics = getMetricsSummary();
    
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get metrics', message: error.message },
      { status: 500 }
    );
  }
}
