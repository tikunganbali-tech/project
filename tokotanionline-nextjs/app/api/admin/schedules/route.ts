/**
 * PHASE UI-A: ContentSchedule CRUD API
 * 
 * GET /api/admin/schedules - List all schedules
 * POST /api/admin/schedules - Create new schedule
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createScheduleSchema = z.object({
  name: z.string().min(1, 'Nama scheduler diperlukan'),
  mode: z.enum(['BLOG', 'PRODUCT']),
  status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED'),
  productionPerDay: z.number().int().min(1).max(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  publishMode: z.enum(['AUTO_PUBLISH', 'DRAFT_ONLY', 'QC_REQUIRED']).default('DRAFT_ONLY'),
  timeWindowStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format: HH:mm'),
  timeWindowEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format: HH:mm'),
});

/**
 * GET /api/admin/schedules
 * List all schedules with keyword counts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await prisma.contentSchedule.findMany({
      include: {
        keywords: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate keyword stats
    const schedulesWithStats = schedules.map(schedule => {
      const keywords = schedule.keywords;
      const stats = {
        total: keywords.length,
        pending: keywords.filter(k => k.status === 'PENDING').length,
        processing: keywords.filter(k => k.status === 'PROCESSING').length,
        done: keywords.filter(k => k.status === 'DONE').length,
        failed: keywords.filter(k => k.status === 'FAILED').length,
      };

      return {
        ...schedule,
        keywordStats: stats,
        keywords: undefined, // Remove detailed keywords from list view
      };
    });

    return NextResponse.json({
      success: true,
      schedules: schedulesWithStats,
    });
  } catch (error: any) {
    console.error('[SCHEDULES] GET error:', error);
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
 * POST /api/admin/schedules
 * Create new schedule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createScheduleSchema.parse(body);

    // Validate time window
    const [startHour, startMin] = data.timeWindowStart.split(':').map(Number);
    const [endHour, endMin] = data.timeWindowEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { success: false, error: 'Jam selesai harus setelah jam mulai' },
        { status: 400 }
      );
    }

    const schedule = await prisma.contentSchedule.create({
      data: {
        name: data.name,
        mode: data.mode,
        status: data.status,
        productionPerDay: data.productionPerDay,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        publishMode: data.publishMode,
        timeWindowStart: data.timeWindowStart,
        timeWindowEnd: data.timeWindowEnd,
      },
      include: {
        keywords: true,
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

    console.error('[SCHEDULES] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal membuat scheduler',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
