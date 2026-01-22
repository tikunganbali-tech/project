/**
 * Go Engine API Bridge - Metrics
 * Proxy to Go Engine API server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// GET - Get system metrics from Go API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GO_ENGINE_API_URL}/api/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Fallback to note layer if Go API is not available
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      const NOTE_PATH = join(process.cwd(), '..', 'note');
      const metricsPath = join(NOTE_PATH, 'metrics.json');
      
      if (existsSync(metricsPath)) {
        const metricsData = readFileSync(metricsPath, 'utf-8');
        const metrics = JSON.parse(metricsData);
        return NextResponse.json(metrics);
      }
      
      return NextResponse.json({
        last_heartbeat: null,
        total_engines: 0,
        active_engines: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        last_update: null,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Go engine metrics:', error);
    
    // Fallback to note layer
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      const NOTE_PATH = join(process.cwd(), '..', 'note');
      const metricsPath = join(NOTE_PATH, 'metrics.json');
      
      if (existsSync(metricsPath)) {
        const metricsData = readFileSync(metricsPath, 'utf-8');
        const metrics = JSON.parse(metricsData);
        return NextResponse.json(metrics);
      }
    } catch (fallbackError) {
      // Ignore fallback error
    }
    
    return NextResponse.json({
      last_heartbeat: null,
      total_engines: 0,
      active_engines: 0,
      completed_tasks: 0,
      failed_tasks: 0,
      last_update: null,
    });
  }
}


