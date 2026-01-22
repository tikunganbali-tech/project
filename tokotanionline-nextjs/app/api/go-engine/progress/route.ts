/**
 * Go Engine API Bridge - Progress
 * Proxy to Go Engine API server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// GET - Get all engine progress from Go API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('engine');

    let url = `${GO_ENGINE_API_URL}/api/progress`;
    if (engineName) {
      url = `${GO_ENGINE_API_URL}/api/progress/${engineName}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Fallback to note layer if Go API is not available
      const { readFileSync, existsSync, readdirSync } = await import('fs');
      const { join } = await import('path');
      const NOTE_PATH = join(process.cwd(), '..', 'note');
      const progressPath = join(NOTE_PATH, 'progress');
      
      if (engineName) {
        const engineProgressPath = join(progressPath, `${engineName}.json`);
        if (existsSync(engineProgressPath)) {
          const progressData = readFileSync(engineProgressPath, 'utf-8');
          const progress = JSON.parse(progressData);
          return NextResponse.json(progress);
        }
        return NextResponse.json({});
      } else {
        // Return all progress
        const progressMap: Record<string, any> = {};
        if (existsSync(progressPath)) {
          const files = readdirSync(progressPath).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const engineName = file.replace('.json', '');
            const filePath = join(progressPath, file);
            const progressData = readFileSync(filePath, 'utf-8');
            progressMap[engineName] = JSON.parse(progressData);
          }
        }
        return NextResponse.json(progressMap);
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Go engine progress:', error);
    
    // Fallback to note layer
    try {
      const { readFileSync, existsSync, readdirSync } = await import('fs');
      const { join } = await import('path');
      const NOTE_PATH = join(process.cwd(), '..', 'note');
      const progressPath = join(NOTE_PATH, 'progress');
      
      const { searchParams } = new URL(request.url);
      const fallbackEngineName = searchParams.get('engine');
      
      if (fallbackEngineName) {
        const engineProgressPath = join(progressPath, `${fallbackEngineName}.json`);
        if (existsSync(engineProgressPath)) {
          const progressData = readFileSync(engineProgressPath, 'utf-8');
          const progress = JSON.parse(progressData);
          return NextResponse.json(progress);
        }
        return NextResponse.json({});
      } else {
        const progressMap: Record<string, any> = {};
        if (existsSync(progressPath)) {
          const files = readdirSync(progressPath).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const engineName = file.replace('.json', '');
            const filePath = join(progressPath, file);
            const progressData = readFileSync(filePath, 'utf-8');
            progressMap[engineName] = JSON.parse(progressData);
          }
        }
        return NextResponse.json(progressMap);
      }
    } catch (fallbackError) {
      // Ignore fallback error
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch progress', details: error.message },
      { status: 500 }
    );
  }
}

