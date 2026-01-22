/**
 * PHASE UI-A: ContentSchedule Detail API
 * 
 * GET /api/admin/schedules/[id] - Get schedule details
 * PUT /api/admin/schedules/[id] - Update schedule
 * DELETE /api/admin/schedules/[id] - Delete schedule
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { 
  isValidTransition, 
  validateTransition, 
  canHardDelete, 
  canPause, 
  canResume, 
  canCancel, 
  canUpdate,
  type JobStatus 
} from '@/lib/scheduler-job-lifecycle';

const updateScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  mode: z.enum(['BLOG', 'PRODUCT']).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'FINISHED']).optional(),
  productionPerDay: z.number().int().min(1).max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  publishMode: z.enum(['AUTO_PUBLISH', 'DRAFT_ONLY', 'QC_REQUIRED']).optional(),
  timeWindowStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timeWindowEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

/**
 * GET /api/admin/schedules/[id]
 * Get schedule details with keywords
 */
export async function GET(
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
      include: {
        keywords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    console.error('[SCHEDULES] GET [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil data scheduler',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/schedules/[id]
 * Update schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateScheduleSchema.parse(body);

    // Check if schedule exists
    const existing = await prisma.contentSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    // PHASE E: Validate state transition if status is being changed
    if (data.status !== undefined && data.status !== existing.status) {
      // Map ScheduleStatus to JobStatus for validation
      const currentJobStatus = mapScheduleStatusToJobStatus(existing.status);
      const targetJobStatus = mapScheduleStatusToJobStatus(data.status);
      
      const transitionError = validateTransition(currentJobStatus, targetJobStatus);
      if (transitionError) {
        return NextResponse.json(
          {
            success: false,
            error: transitionError,
          },
          { status: 400 }
        );
      }
    }

    // PHASE E: Check if job can be updated (schedule time, batch, etc.)
    if (data.productionPerDay !== undefined || data.startDate !== undefined || 
        data.endDate !== undefined || data.timeWindowStart !== undefined || 
        data.timeWindowEnd !== undefined) {
      const currentJobStatus = mapScheduleStatusToJobStatus(existing.status);
      if (!canUpdate(currentJobStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot update job in ${existing.status} status. Job must be SCHEDULED or PAUSED to update.`,
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.productionPerDay !== undefined) updateData.productionPerDay = data.productionPerDay;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.publishMode !== undefined) updateData.publishMode = data.publishMode;
    if (data.timeWindowStart !== undefined) updateData.timeWindowStart = data.timeWindowStart;
    if (data.timeWindowEnd !== undefined) updateData.timeWindowEnd = data.timeWindowEnd;
    
    // PHASE E: Track lastRunAt and nextRunAt for job lifecycle
    updateData.updatedAt = new Date();

    // Validate time window if both are provided
    if (updateData.timeWindowStart && updateData.timeWindowEnd) {
      const [startHour, startMin] = updateData.timeWindowStart.split(':').map(Number);
      const [endHour, endMin] = updateData.timeWindowEnd.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          { success: false, error: 'Jam selesai harus setelah jam mulai' },
          { status: 400 }
        );
      }
    } else if (updateData.timeWindowStart || updateData.timeWindowEnd) {
      // If only one is provided, validate against existing value
      const timeStart = updateData.timeWindowStart || existing.timeWindowStart;
      const timeEnd = updateData.timeWindowEnd || existing.timeWindowEnd;
      const [startHour, startMin] = timeStart.split(':').map(Number);
      const [endHour, endMin] = timeEnd.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          { success: false, error: 'Jam selesai harus setelah jam mulai' },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.contentSchedule.update({
      where: { id: params.id },
      data: updateData,
      include: {
        keywords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data tidak valid',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('[SCHEDULES] PUT [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengupdate scheduler',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/schedules/[id]
 * Delete schedule (cascades to keywords)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.contentSchedule.findUnique({
      where: { id: params.id },
      include: {
        keywords: {
          where: {
            status: 'PROCESSING', // Check if any keyword is RUNNING
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    // PHASE E: Guard - Check if job is RUNNING (cannot hard delete)
    // Map ScheduleStatus to JobStatus
    const currentJobStatus = mapScheduleStatusToJobStatus(existing.status);
    
    // PHASE E: Also check if any keyword is PROCESSING (RUNNING)
    const hasRunningKeywords = existing.keywords && existing.keywords.length > 0;
    
    if (!canHardDelete(currentJobStatus) || hasRunningKeywords) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete job: Job is RUNNING or has keywords in PROCESSING state. Please pause or cancel the job first.',
          currentStatus: existing.status,
          hasRunningKeywords,
        },
        { status: 400 }
      );
    }

    // PHASE E: Soft cancel first (if not already CANCELLED)
    if (currentJobStatus !== 'CANCELLED') {
      await prisma.contentSchedule.update({
        where: { id: params.id },
        data: { status: 'FINISHED' }, // Map to CANCELLED equivalent
      });
    }

    // PHASE E: Hard delete (only if not RUNNING)
    await prisma.contentSchedule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduler berhasil dihapus',
    });
  } catch (error: any) {
    console.error('[SCHEDULES] DELETE [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menghapus scheduler',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PHASE E: Helper function to map ScheduleStatus to JobStatus
 * ScheduleStatus: ACTIVE, PAUSED, FINISHED
 * JobStatus: SCHEDULED, RUNNING, PAUSED, CANCELLED, COMPLETED
 */
function mapScheduleStatusToJobStatus(scheduleStatus: string): JobStatus {
  switch (scheduleStatus) {
    case 'ACTIVE':
      // ACTIVE could be SCHEDULED or RUNNING depending on context
      // For now, treat as SCHEDULED (can transition to RUNNING)
      return 'SCHEDULED';
    case 'PAUSED':
      return 'PAUSED';
    case 'FINISHED':
      return 'COMPLETED';
    default:
      return 'SCHEDULED';
  }
}

/**
 * PHASE E: Helper function to map JobStatus to ScheduleStatus
 */
function mapJobStatusToScheduleStatus(jobStatus: JobStatus): 'ACTIVE' | 'PAUSED' | 'FINISHED' {
  switch (jobStatus) {
    case 'SCHEDULED':
    case 'RUNNING':
      return 'ACTIVE';
    case 'PAUSED':
      return 'PAUSED';
    case 'CANCELLED':
    case 'COMPLETED':
      return 'FINISHED';
    default:
      return 'ACTIVE';
  }
}
