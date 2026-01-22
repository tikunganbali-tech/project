/**
 * API Route: Get Improvement Progress
 * Check progress of blog improvement process
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const progressLogId = searchParams.get('logId');

    if (!progressLogId) {
      return NextResponse.json({ error: 'progressLogId required' }, { status: 400 });
    }

    const log = await prisma.aIContentGenerationLog.findUnique({
      where: { id: progressLogId },
      select: {
        id: true,
        phase: true,
        phaseStatus: true,
        status: true,
        phaseData: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!log) {
      return NextResponse.json({ error: 'Progress log not found' }, { status: 404 });
    }

    // Parse improvements to get progress
    let progress = 0;
    let message = 'Memulai proses...';
    
    if (log.status === 'completed') {
      progress = 100;
      message = 'Proses selesai!';
    } else if (log.status === 'failed') {
      progress = 0;
      message = log.errorMessage || 'Proses gagal';
    } else {
      // Calculate progress based on phase
      const phaseMap: Record<string, number> = {
        init: 5,
        loading: 10,
        analyze: 15,
        content: 50,
        image: 65,
        seo: 80,
        engines: 95,
        validation: 98,
        completed: 100,
      };
      progress = phaseMap[log.phase] || 10;
      
      // Try to parse message from phaseData
      try {
        const phaseData = log.phaseData ? JSON.parse(log.phaseData) : null;
        if (phaseData && typeof phaseData === 'object') {
          if (phaseData.message) {
            message = phaseData.message;
          }
          if (phaseData.progress !== undefined) {
            progress = phaseData.progress;
          }
        }
      } catch {
        // Use default message
      }
    }

    // Calculate elapsed time
    const startedAt = log.startedAt ? new Date(log.startedAt).getTime() : Date.now();
    const completedAt = log.completedAt ? new Date(log.completedAt).getTime() : null;
    const elapsed = completedAt ? completedAt - startedAt : Date.now() - startedAt;

    return NextResponse.json({
      logId: log.id,
      phase: log.phase,
      status: log.status,
      phaseStatus: log.phaseStatus,
      progress,
      message,
      elapsed: Math.round(elapsed / 1000), // seconds
      isCompleted: log.status === 'completed',
      isFailed: log.status === 'failed',
      errorMessage: log.errorMessage,
    });
  } catch (error: any) {
    console.error('Error getting progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get progress' },
      { status: 500 }
    );
  }
}

