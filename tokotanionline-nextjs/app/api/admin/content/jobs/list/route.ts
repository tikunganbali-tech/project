/**
 * STEP 20B-2: Content Job List API
 * GET /api/admin/content/jobs/list
 * 
 * Purpose: Admin dapat melihat daftar job
 * - Role: admin / super_admin
 * - Read-only
 * - Pagination optional
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/content/jobs/list - List jobs
export async function GET(request: NextRequest) {
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

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status'); // Optional filter by status
    const type = searchParams.get('type'); // Optional filter by type

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // Max 100 items per page

    // Fetch jobs with pagination
    const [jobs, total] = await Promise.all([
      prisma.contentJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          requestedBy: true,
        },
      }),
      prisma.contentJob.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching content jobs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch content jobs',
    }, { status: 500 });
  }
}

