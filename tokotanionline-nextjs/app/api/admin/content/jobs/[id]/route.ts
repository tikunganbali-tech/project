/**
 * STEP 20B-3: Content Job Detail API
 * GET /api/admin/content/jobs/[id]
 * 
 * Purpose: Admin dapat melihat detail job dan hasilnya
 * - Role: admin / super_admin
 * - Read-only
 * - Include result jika ada
 * - Tidak trigger engine
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/content/jobs/[id] - Job detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch job with result and post (if exists)
    const job = await prisma.contentJob.findUnique({
      where: { id: params.id },
      include: {
        contentResult: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                publishedAt: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Build response
    const response: any = {
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        requestedBy: job.requestedBy,
        scheduledAt: job.scheduledAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        params: job.params,
        createdAt: job.createdAt,
      },
    };

    // Include result if exists
    if (job.contentResult) {
      response.result = {
        id: job.contentResult.id,
        jobId: job.contentResult.jobId,
        postId: job.contentResult.postId,
        summary: job.contentResult.summary,
        outline: job.contentResult.outline,
        metrics: job.contentResult.metrics,
        engineVersion: job.contentResult.engineVersion,
        createdAt: job.contentResult.createdAt,
        post: job.contentResult.post, // Include post if linked
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching content job detail:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch content job detail',
    }, { status: 500 });
  }
}

