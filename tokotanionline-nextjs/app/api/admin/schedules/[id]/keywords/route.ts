/**
 * PHASE UI-A: ScheduleKeyword Management API
 * 
 * GET /api/admin/schedules/[id]/keywords - Get keywords for schedule
 * POST /api/admin/schedules/[id]/keywords - Add keywords (bulk)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addKeywordsSchema = z.object({
  keywords: z.array(z.object({
    primaryKeyword: z.string().min(1, 'Primary keyword tidak boleh kosong'),
    secondaryKeywords: z.array(z.string()).optional().default([]),
  })),
});

/**
 * GET /api/admin/schedules/[id]/keywords
 * Get all keywords for a schedule
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

    // Check if schedule exists
    const schedule = await prisma.contentSchedule.findUnique({
      where: { id: params.id },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    const keywords = await prisma.scheduleKeyword.findMany({
      where: { scheduleId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      keywords,
    });
  } catch (error: any) {
    console.error('[SCHEDULE-KEYWORDS] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil data keyword',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/schedules/[id]/keywords
 * Add keywords (bulk insert)
 * Accepts: { keywords: [{ primaryKeyword: string, secondaryKeywords?: string[] }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if schedule exists
    const schedule = await prisma.contentSchedule.findUnique({
      where: { id: params.id },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Scheduler tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = addKeywordsSchema.parse(body);

    // Create keywords
    const created = await prisma.$transaction(
      data.keywords.map(keyword =>
        prisma.scheduleKeyword.create({
          data: {
            scheduleId: params.id,
            primaryKeyword: keyword.primaryKeyword.trim(),
            secondaryKeywords: keyword.secondaryKeywords || [],
            status: 'PENDING',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      keywords: created,
      message: `Berhasil menambahkan ${created.length} keyword`,
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

    console.error('[SCHEDULE-KEYWORDS] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menambahkan keyword',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
