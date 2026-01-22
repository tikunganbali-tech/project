/**
 * Engine Control API
 * Proxy to Golang Engine Hub server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('name');

    if (!engineName) {
      return NextResponse.json(
        { error: 'Engine name is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'start' && action !== 'stop')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.ENGINE_HUB_URL;

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'ENGINE_HUB_URL not set' },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${baseUrl}/engines/control?name=${engineName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to control engine' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error controlling engine:', error);
    return NextResponse.json(
      { error: 'Failed to control engine', details: error.message },
      { status: 500 }
    );
  }
}


