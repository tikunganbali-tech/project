/**
 * STEP 20B-1: Content Job Create API
 * POST /api/admin/content/jobs
 * 
 * Purpose: Admin dapat membuat job untuk engine
 * - Role: admin / super_admin
 * - Default status: PENDING
 * - Tidak trigger engine (hanya write ke DB)
 * - Golang Engine akan poll job ini
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// POST /api/admin/content/jobs - Create job
export async function POST(request: NextRequest) {
  try {
    // Role guard: admin or super_admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const adminId = (session.user as any)?.id;
    if (!adminId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { type, scheduledAt, params } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Validate type enum
    if (!['GENERATE', 'REFRESH', 'OPTIMIZE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be GENERATE, REFRESH, or OPTIMIZE' }, { status: 400 });
    }

    // Create job with default status PENDING
    const job = await prisma.contentJob.create({
      data: {
        type: type as 'GENERATE' | 'REFRESH' | 'OPTIMIZE',
        status: 'PENDING', // Default status
        requestedBy: adminId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        params: params || null,
      },
    });

    logger.info(`Content job created: ${job.id} by admin ${adminId}`, { jobId: job.id, type, adminId });

    return NextResponse.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        requestedBy: job.requestedBy,
        scheduledAt: job.scheduledAt,
        params: job.params,
        createdAt: job.createdAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating content job:', error);
    
    // Check for Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Job already exists',
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to create content job',
    }, { status: 500 });
  }
}

