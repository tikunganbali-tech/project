/**
 * UI-B3: Retry Job API
 * 
 * Retry a FAILED job by:
 * - Changing status back to PENDING
 * - Clearing error
 * - Resetting timestamps
 * - Re-queuing for processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Find the job
    const job = await prisma.contentJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only allow retry for FAILED jobs
    if (job.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Only FAILED jobs can be retried' },
        { status: 400 }
      );
    }

    // Update job to PENDING and clear error
    const updated = await prisma.contentJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        error: null,
        startedAt: null,
        finishedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
      job: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry job',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
