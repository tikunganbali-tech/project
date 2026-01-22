/**
 * PHASE E — Scheduler Job Cancel API
 * 
 * POST /api/admin/schedules/[id]/cancel
 * 
 * Fungsi: Cancel scheduler job (soft delete)
 * 
 * Validasi:
 * - Job harus SCHEDULED, RUNNING, atau PAUSED
 * - State transition validation
 * - Cannot cancel CANCELLED or COMPLETED
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canCancel, validateTransition, type JobStatus } from '@/lib/scheduler-job-lifecycle';

function mapScheduleStatusToJobStatus(scheduleStatus: string): JobStatus {
  switch (scheduleStatus) {
    case 'ACTIVE':
      return 'SCHEDULED';
    case 'PAUSED':
      return 'PAUSED';
    case 'FINISHED':
      return 'COMPLETED';
    default:
      return 'SCHEDULED';
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await prisma.contentSchedule.findUnique({
      where: { id: params.id },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    // PHASE E: Check if job can be cancelled
    const currentJobStatus = mapScheduleStatusToJobStatus(schedule.status);
    if (!canCancel(currentJobStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel job in ${schedule.status} status. Job is already CANCELLED or COMPLETED.`,
        },
        { status: 400 }
      );
    }

    // PHASE E: Validate state transition
    const transitionError = validateTransition(currentJobStatus, 'CANCELLED');
    if (transitionError) {
      return NextResponse.json(
        {
          success: false,
          error: transitionError,
        },
        { status: 400 }
      );
    }

    // PHASE E: Update status to FINISHED (map to CANCELLED)
    const updated = await prisma.contentSchedule.update({
      where: { id: params.id },
      data: {
        status: 'FINISHED', // Map to CANCELLED equivalent
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      schedule: updated,
    });
  } catch (error: any) {
    console.error('[SCHEDULES] POST [id]/cancel error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal cancel job',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
