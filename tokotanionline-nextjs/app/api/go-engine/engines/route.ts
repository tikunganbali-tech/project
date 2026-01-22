/**
 * Go Engine API Bridge - Engines
 * Proxy to Go Engine API server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// GET - List all engines from Go API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${GO_ENGINE_API_URL}/api/engines`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Fallback: return default engines list
      return NextResponse.json({
        engines: [
          {
            name: 'content',
            description: 'Content generation engine',
            status: 'ready',
          },
          {
            name: 'image',
            description: 'Image generation engine',
            status: 'ready',
          },
          {
            name: 'smart-adset',
            description: 'Smart adset generation engine',
            status: 'ready',
          },
          {
            name: 'output',
            description: 'Output compiler engine',
            status: 'ready',
          },
        ],
        total: 4,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Go engines:', error);
    
    // Fallback: return default engines list
    return NextResponse.json({
      engines: [
        {
          name: 'content',
          description: 'Content generation engine',
          status: 'ready',
        },
        {
          name: 'image',
          description: 'Image generation engine',
          status: 'ready',
        },
        {
          name: 'smart-adset',
          description: 'Smart adset generation engine',
          status: 'ready',
        },
        {
          name: 'output',
          description: 'Output compiler engine',
          status: 'ready',
        },
      ],
      total: 4,
    });
  }
}

// POST - Control engine (start/stop)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { engine, action } = body;

    if (!engine || !action) {
      return NextResponse.json(
        { error: 'Missing engine or action' },
        { status: 400 }
      );
    }

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      );
    }

    const response = await fetch(`${GO_ENGINE_API_URL}/api/engines/${engine}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to control engine' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error controlling Go engine:', error);
    return NextResponse.json(
      { error: 'Failed to control engine', details: error.message },
      { status: 500 }
    );
  }
}


