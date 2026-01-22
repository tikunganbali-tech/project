/**
 * PHASE E — Scheduler Job Pause API
 * 
 * POST /api/admin/schedules/[id]/pause
 * 
 * Fungsi: Pause scheduler job
 * 
 * Validasi:
 * - Job harus SCHEDULED atau RUNNING
 * - State transition validation
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canPause, validateTransition, type JobStatus } from '@/lib/scheduler-job-lifecycle';

function mapScheduleStatusToJobStatus(scheduleStatus: string): JobStatus {
  switch (scheduleStatus) {
    case 'ACTIVE':
      return 'SCHEDULED'; // ACTIVE = SCHEDULED (can be paused)
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

    // PHASE E: Check if job can be paused
    const currentJobStatus = mapScheduleStatusToJobStatus(schedule.status);
    if (!canPause(currentJobStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot pause job in ${schedule.status} status. Job must be SCHEDULED or RUNNING to pause.`,
        },
        { status: 400 }
      );
    }

    // PHASE E: Validate state transition
    const transitionError = validateTransition(currentJobStatus, 'PAUSED');
    if (transitionError) {
      return NextResponse.json(
        {
          success: false,
          error: transitionError,
        },
        { status: 400 }
      );
    }

    // PHASE E: Update status to PAUSED
    const updated = await prisma.contentSchedule.update({
      where: { id: params.id },
      data: {
        status: 'PAUSED',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job paused successfully',
      schedule: updated,
    });
  } catch (error: any) {
    console.error('[SCHEDULES] POST [id]/pause error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal pause job',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
