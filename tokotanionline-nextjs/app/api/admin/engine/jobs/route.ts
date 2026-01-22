/**
 * UI-B2: Engine Jobs API
 * GET /api/admin/engine/jobs - List all jobs with human-readable errors
 * 
 * Returns jobs from ContentJob table with:
 * - Job ID
 * - Type (BLOG/PRODUCT from params)
 * - Primary Keyword (from params)
 * - Schedule Name (from params)
 * - Status (PENDING, PROCESSING, DONE, FAILED)
 * - Started At, Finished At, Duration
 * - Error (human-readable, no stack trace)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper to extract human-readable error from various error formats
function getHumanReadableError(error: string | null | undefined): string | null {
  if (!error) return null;
  
  // If already human-readable, return as is
  if (!error.includes('Error:') && !error.includes('at ') && !error.includes('stack')) {
    return error;
  }
  
  // Extract first meaningful line
  const lines = error.split('\n');
  for (const line of lines) {
    if (line.trim() && !line.includes('at ') && !line.includes('stack')) {
      // Remove common technical prefixes
      const cleaned = line
        .replace(/^Error:\s*/i, '')
        .replace(/^TypeError:\s*/i, '')
        .replace(/^ReferenceError:\s*/i, '')
        .trim();
      
      if (cleaned) {
        // Make it more human-readable
        if (cleaned.includes('AI gagal')) {
          return 'AI gagal memproduksi konten. Akan dicoba ulang.';
        }
        if (cleaned.includes('timeout') || cleaned.includes('Timeout')) {
          return 'Proses memakan waktu terlalu lama. Akan dicoba ulang.';
        }
        if (cleaned.includes('network') || cleaned.includes('fetch')) {
          return 'Gagal terhubung ke server. Akan dicoba ulang.';
        }
        return cleaned;
      }
    }
  }
  
  // Fallback
  return 'Terjadi kesalahan saat memproses. Akan dicoba ulang.';
}

// GET - List all jobs from database
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // Optional filter

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const jobs = await prisma.contentJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Transform jobs to include human-readable info
    const transformedJobs = jobs.map((job) => {
      // Parse params to extract keyword and schedule info
      let type: 'BLOG' | 'PRODUCT' = 'BLOG';
      let primaryKeyword = 'N/A';
      let scheduleName = 'N/A';

      if (job.params) {
        try {
          const params = typeof job.params === 'string' 
            ? JSON.parse(job.params) 
            : job.params;
          
          // Try to get type from params
          if (params.type) {
            type = params.type === 'PRODUCT' ? 'PRODUCT' : 'BLOG';
          } else if (params.mode) {
            type = params.mode === 'PRODUCT' ? 'PRODUCT' : 'BLOG';
          }
          
          // Try to get keyword
          if (params.primaryKeyword) {
            primaryKeyword = params.primaryKeyword;
          } else if (params.keyword) {
            primaryKeyword = params.keyword;
          } else if (params.keywords && Array.isArray(params.keywords) && params.keywords[0]) {
            primaryKeyword = params.keywords[0];
          }
          
          // Try to get schedule name
          if (params.scheduleName) {
            scheduleName = params.scheduleName;
          } else if (params.schedule) {
            scheduleName = typeof params.schedule === 'string' 
              ? params.schedule 
              : params.schedule.name || 'N/A';
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Calculate duration
      let duration: string | null = null;
      if (job.startedAt && job.finishedAt) {
        const ms = job.finishedAt.getTime() - job.startedAt.getTime();
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
          duration = `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          duration = `${minutes}m ${seconds % 60}s`;
        } else {
          duration = `${seconds}s`;
        }
      }

      // Map status: RUNNING -> PROCESSING for UI
      const displayStatus = job.status === 'RUNNING' ? 'PROCESSING' : job.status;

      return {
        id: job.id,
        type,
        primaryKeyword,
        scheduleName,
        status: displayStatus,
        startedAt: job.startedAt?.toISOString() || null,
        finishedAt: job.finishedAt?.toISOString() || null,
        duration,
        error: getHumanReadableError(job.error),
        createdAt: job.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
    });
  } catch (error: any) {
    console.error('Error fetching engine jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch jobs',
        message: error.message,
        jobs: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

