/**
 * NOTE LAYER API - READ-ONLY
 * Read engine logs from NOTE layer
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const NOTE_PATH = join(process.cwd(), '..', 'note');

// GET - Read logs for a specific engine
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('engine');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!engineName) {
      return NextResponse.json(
        { error: 'Engine name is required' },
        { status: 400 }
      );
    }

    const logsPath = join(NOTE_PATH, 'logs', `${engineName}.log`);

    if (!existsSync(logsPath)) {
      return NextResponse.json({ logs: [] });
    }

    // Read log file and parse lines
    const logContent = readFileSync(logsPath, 'utf-8');
    const lines = logContent.split('\n').filter(line => line.trim());

    // Parse log entries
    const logs = lines
      .map(line => {
        // Format: [timestamp] [LEVEL] message
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3],
          };
        }
        return null;
      })
      .filter((log): log is { timestamp: string; level: string; message: string } => log !== null)
      .slice(-limit) // Get last N entries
      .reverse(); // Most recent first

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error reading logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs', details: error.message },
      { status: 500 }
    );
  }
}
