/**
 * NOTE LAYER API - READ-ONLY
 * Read system metrics from NOTE layer
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const NOTE_PATH = join(process.cwd(), '..', 'note');

// GET - Read metrics.json
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metricsPath = join(NOTE_PATH, 'metrics.json');

    if (!existsSync(metricsPath)) {
      return NextResponse.json({
        last_heartbeat: null,
        total_engines: 0,
        active_engines: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        last_update: null,
      });
    }

    const metricsData = readFileSync(metricsPath, 'utf-8');
    const metrics = JSON.parse(metricsData);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error reading metrics:', error);
    return NextResponse.json(
      { error: 'Failed to read metrics', details: error.message },
      { status: 500 }
    );
  }
}


