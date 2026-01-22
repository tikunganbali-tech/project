/**
 * Go Engine API Bridge - Status
 * Proxy to Go Engine API server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// GET - Get engine status from Go API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GO_ENGINE_API_URL}/api/status`, {
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
      const statusPath = join(NOTE_PATH, 'status.json');
      
      if (existsSync(statusPath)) {
        const statusData = readFileSync(statusPath, 'utf-8');
        const status = JSON.parse(statusData);
        return NextResponse.json(status);
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch status from Go API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Go engine status:', error);
    
    // Fallback to note layer
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      const NOTE_PATH = join(process.cwd(), '..', 'note');
      const statusPath = join(NOTE_PATH, 'status.json');
      
      if (existsSync(statusPath)) {
        const statusData = readFileSync(statusPath, 'utf-8');
        const status = JSON.parse(statusData);
        return NextResponse.json(status);
      }
    } catch (fallbackError) {
      // Ignore fallback error
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
}


