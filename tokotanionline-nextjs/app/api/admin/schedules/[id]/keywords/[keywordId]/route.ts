/**
 * PHASE UI-A: ScheduleKeyword Individual Operations API
 * 
 * PUT /api/admin/schedules/[id]/keywords/[keywordId] - Update keyword (retry, status)
 * DELETE /api/admin/schedules/[id]/keywords/[keywordId] - Delete keyword
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateKeywordSchema = z.object({
  primaryKeyword: z.string().min(1).optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'DONE', 'FAILED']).optional(),
  lastError: z.string().nullable().optional(),
});

/**
 * PUT /api/admin/schedules/[id]/keywords/[keywordId]
 * Update keyword (for retry or edit)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; keywordId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateKeywordSchema.parse(body);

    // Check if keyword exists and belongs to schedule
    const keyword = await prisma.scheduleKeyword.findFirst({
      where: {
        id: params.keywordId,
        scheduleId: params.id,
      },
    });

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword tidak ditemukan' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (data.primaryKeyword !== undefined) {
      if (data.primaryKeyword.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Primary keyword tidak boleh kosong' },
          { status: 400 }
        );
      }
      updateData.primaryKeyword = data.primaryKeyword.trim();
    }
    if (data.secondaryKeywords !== undefined) updateData.secondaryKeywords = data.secondaryKeywords;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.lastError !== undefined) updateData.lastError = data.lastError;

    // If retrying (status changed to PENDING), clear lastError
    if (data.status === 'PENDING' && keyword.status === 'FAILED') {
      updateData.lastError = null;
    }

    const updated = await prisma.scheduleKeyword.update({
      where: { id: params.keywordId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      keyword: updated,
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

    console.error('[SCHEDULE-KEYWORD] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengupdate keyword',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/schedules/[id]/keywords/[keywordId]
 * Delete keyword
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; keywordId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if keyword exists and belongs to schedule
    const keyword = await prisma.scheduleKeyword.findFirst({
      where: {
        id: params.keywordId,
        scheduleId: params.id,
      },
    });

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword tidak ditemukan' },
        { status: 404 }
      );
    }

    await prisma.scheduleKeyword.delete({
      where: { id: params.keywordId },
    });

    return NextResponse.json({
      success: true,
      message: 'Keyword berhasil dihapus',
    });
  } catch (error: any) {
    console.error('[SCHEDULE-KEYWORD] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menghapus keyword',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
