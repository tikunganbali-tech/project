/**
 * FASE 4 — SCHEDULER CONFIG API
 * 
 * GET /api/admin/scheduler/config - Get scheduler configuration
 * PUT /api/admin/scheduler/config - Update scheduler configuration
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const configSchema = z.object({
  enabled: z.boolean().optional(),
  timezone: z.string().optional(),
  dailyQuota: z.number().int().min(1).max(10).optional(),
  runWindows: z.array(z.string()).optional(), // e.g. ["09:00-12:00", "14:00-17:00"]
  contentMix: z.string().optional(), // JSON string
});

/**
 * GET /api/admin/scheduler/config
 * Get current scheduler configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create default config
    let config = await prisma.schedulerConfig.findFirst();
    
    if (!config) {
      // Create default config
      config = await prisma.schedulerConfig.create({
        data: {
          enabled: false,
          timezone: 'Asia/Jakarta',
          dailyQuota: 3,
          runWindows: ['09:00-21:00'],
          contentMix: JSON.stringify({ blog: 3, product: 2 }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        contentMix: config.contentMix ? JSON.parse(config.contentMix) : { blog: 3, product: 2 },
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULER-CONFIG] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get config',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/scheduler/config
 * Update scheduler configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = configSchema.parse(body);

    // Get or create config
    let config = await prisma.schedulerConfig.findFirst();
    
    const updateData: any = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.dailyQuota !== undefined) updateData.dailyQuota = data.dailyQuota;
    if (data.runWindows !== undefined) updateData.runWindows = data.runWindows;
    if (data.contentMix !== undefined) {
      updateData.contentMix = typeof data.contentMix === 'string' 
        ? data.contentMix 
        : JSON.stringify(data.contentMix);
    }

    if (config) {
      config = await prisma.schedulerConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    } else {
      config = await prisma.schedulerConfig.create({
        data: {
          enabled: data.enabled ?? false,
          timezone: data.timezone ?? 'Asia/Jakarta',
          dailyQuota: data.dailyQuota ?? 3,
          runWindows: data.runWindows ?? ['09:00-21:00'],
          contentMix: typeof data.contentMix === 'string' 
            ? data.contentMix 
            : JSON.stringify(data.contentMix ?? { blog: 3, product: 2 }),
        },
      });
    }

    console.log(`[SCHEDULER-CONFIG] Updated: enabled=${config.enabled}, quota=${config.dailyQuota}`);

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        contentMix: config.contentMix ? JSON.parse(config.contentMix) : { blog: 3, product: 2 },
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULER-CONFIG] PUT error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to update config',
      },
      { status: 500 }
    );
  }
}
