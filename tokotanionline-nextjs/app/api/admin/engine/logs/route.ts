/**
 * UI-B5: Engine Logs API
 * 
 * Returns human-readable logs from EngineLog table
 * - No stack traces
 * - No technical logs
 * - Only: Timestamp, Event, Message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Map actionType to human-readable event names
function getEventName(actionType: string, status: string): string {
  // Map common action types to human-readable events
  if (actionType.includes('scheduler') || actionType.includes('schedule')) {
    if (status === 'RUN' || status === 'UPDATE') {
      return 'Scheduler loop start';
    }
  }
  
  if (actionType.includes('job') || actionType.includes('process')) {
    if (status === 'RUN') {
      return 'Job started';
    }
    if (status === 'UPDATE') {
      return 'Job finished';
    }
    if (status === 'ERROR') {
      return 'Job failed';
    }
  }
  
  // Fallback to actionType if no match
  return actionType || 'Event';
}

// Clean message to be human-readable
function getHumanReadableMessage(message: string, error: string | null): string {
  // If there's an error, prioritize it but make it readable
  if (error) {
    // Remove stack traces
    const cleaned = error
      .split('\n')[0] // Take first line only
      .replace(/Error:\s*/i, '')
      .replace(/at\s+.*/g, '')
      .trim();
    
    if (cleaned) {
      return cleaned;
    }
  }
  
  // Use message if available
  if (message) {
    return message;
  }
  
  return 'Tidak ada pesan';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      Math.max(parseInt(limitParam || '100', 10) || 100, 1),
      500
    );

    // Fetch logs from EngineLog table
    // Filter for content-engine related logs
    const logs = await prisma.engineLog.findMany({
      where: {
        engineName: {
          contains: 'content',
          mode: 'insensitive',
        },
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
    });

    // Transform to human-readable format
    const humanReadableLogs = logs.map((log) => ({
      timestamp: log.executedAt.toISOString(),
      event: getEventName(log.actionType, log.status),
      message: getHumanReadableMessage(log.message, log.error),
    }));

    return NextResponse.json({
      logs: humanReadableLogs,
      total: humanReadableLogs.length,
    });
  } catch (error: any) {
    console.error('Error fetching engine logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        message: error.message,
        logs: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}


