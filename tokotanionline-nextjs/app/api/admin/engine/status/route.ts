/**
 * Engine Status API - Proxy to Golang Engine Hub
 * STEP 18A-2: Backend proxy for engine health status
 * 
 * Fetches from: http://localhost:8090/health
 * Auth required: YES
 * SAFE_MODE: Not relevant (read-only)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

export async function GET(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from Golang Engine Hub
    const response = await fetch(`${GO_ENGINE_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Engine is down
      return NextResponse.json(
        {
          status: 'DOWN',
          engine: 'AGRICULTURAL_ENGINE',
          uptime: 0,
          timestamp: new Date().toISOString(),
          error: 'Engine Hub is not responding',
        },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching engine status:', error);
    
    // Return DOWN status if connection fails
    return NextResponse.json(
      {
        status: 'DOWN',
        engine: 'AGRICULTURAL_ENGINE',
        uptime: 0,
        timestamp: new Date().toISOString(),
        error: error.message || 'Failed to connect to Engine Hub',
      },
      { status: 503 }
    );
  }
}

