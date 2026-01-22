/**
 * PHASE E — Scheduler Job Resume API
 * 
 * POST /api/admin/schedules/[id]/resume
 * 
 * Fungsi: Resume scheduler job
 * 
 * Validasi:
 * - Job harus PAUSED
 * - State transition validation
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canResume, validateTransition, type JobStatus } from '@/lib/scheduler-job-lifecycle';

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

    // PHASE E: Check if job can be resumed
    const currentJobStatus = mapScheduleStatusToJobStatus(schedule.status);
    if (!canResume(currentJobStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot resume job in ${schedule.status} status. Job must be PAUSED to resume.`,
        },
        { status: 400 }
      );
    }

    // PHASE E: Validate state transition
    const transitionError = validateTransition(currentJobStatus, 'SCHEDULED');
    if (transitionError) {
      return NextResponse.json(
        {
          success: false,
          error: transitionError,
        },
        { status: 400 }
      );
    }

    // PHASE E: Update status to ACTIVE (resume)
    const updated = await prisma.contentSchedule.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job resumed successfully',
      schedule: updated,
    });
  } catch (error: any) {
    console.error('[SCHEDULES] POST [id]/resume error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal resume job',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
