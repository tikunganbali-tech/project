/**
 * UI-B3: Skip Job API
 * 
 * Skip a job by changing status to SKIPPED
 * - Only allowed for PENDING or FAILED jobs
 * - Marks job as skipped (won't be processed)
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

    // Only allow skip for PENDING or FAILED jobs
    if (job.status !== 'PENDING' && job.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Only PENDING or FAILED jobs can be skipped' },
        { status: 400 }
      );
    }

    // Update job to SKIPPED
    const updated = await prisma.contentJob.update({
      where: { id: jobId },
      data: {
        status: 'SKIPPED',
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job skipped',
      job: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error('Error skipping job:', error);
    return NextResponse.json(
      {
        error: 'Failed to skip job',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
