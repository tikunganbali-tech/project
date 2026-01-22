/**
 * Admin Dashboard Engines Status API
 * GET /api/admin/dashboard/engines
 * 
 * Returns real-time engine status:
 * - AI: UP/DOWN, last_ok_at
 * - SEO: UP/DOWN, last_ok_at
 * - Ads: UP/DOWN, last_ok_at
 * 
 * Requirements:
 * - Real-time status (not dummy)
 * - Cache 30-60 seconds (avoid spam)
 * - Ping /health for each engine (if applicable)
 * - Admin auth required
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { getEngineHealth } from '@/lib/engine-logger';
import * as logger from '@/lib/logger';
import { prisma } from '@/lib/db';

// Simple in-memory cache (30 seconds)
const cache = {
  data: null as any,
  timestamp: 0,
  ttl: 30 * 1000, // 30 seconds
};

async function checkEngineHealth(engineName: string): Promise<{
  status: 'UP' | 'DOWN';
  last_ok_at: string | null;
  reason?: string;
}> {
  try {
    const health = await getEngineHealth(engineName as any);
    
    if (!health) {
      return {
        status: 'DOWN',
        last_ok_at: null,
        reason: 'Engine not found',
      };
    }

    // Check if engine is healthy and has run recently (within 48 hours)
    if (Array.isArray(health)) {
      return { status: 'DOWN', last_ok_at: null, reason: 'Invalid health data format' };
    }
    
    const now = Date.now();
    const lastSuccessTime = (health && 'lastSuccessAt' in health && health.lastSuccessAt) ? new Date(health.lastSuccessAt).getTime() : 0;
    const hoursSinceLastSuccess = (now - lastSuccessTime) / (1000 * 60 * 60);

    if (health.status === 'healthy' && health.isActive && hoursSinceLastSuccess < 48) {
      return {
        status: 'UP',
        last_ok_at: (health && 'lastSuccessAt' in health && health.lastSuccessAt) ? health.lastSuccessAt.toISOString() : null,
      };
    }

    return {
      status: 'DOWN',
      last_ok_at: (health && 'lastSuccessAt' in health && health.lastSuccessAt) ? health.lastSuccessAt.toISOString() : null,
      reason: health.status === 'critical' 
        ? 'Critical errors detected'
        : health.status === 'warning'
        ? 'Warnings detected'
        : !health.isActive
        ? 'Engine inactive'
        : hoursSinceLastSuccess >= 48
        ? 'No successful run in 48 hours'
        : 'Unknown issue',
    };
  } catch (error: any) {
    logger.error(`Error checking engine health for ${engineName}:`, error);
    return {
      status: 'DOWN',
      last_ok_at: null,
      reason: error.message || 'Health check failed',
    };
  }
}

/**
 * Get scheduler status
 */
async function getSchedulerStatus(): Promise<{
  status: 'PAUSED' | 'RUNNING' | 'STOPPED';
  last_action?: string;
  last_action_at?: string | null;
}> {
  try {
    // Check for recent scheduler activity
    const recentJob = await prisma.contentJob.findFirst({
      where: {
        status: { in: ['PENDING', 'RUNNING', 'DONE'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        status: true,
        createdAt: true,
        type: true,
      },
    });

    // Check if scheduler is paused (no recent jobs in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecentActivity = recentJob && new Date(recentJob.createdAt) > oneHourAgo;

    if (!hasRecentActivity) {
      return {
        status: 'PAUSED',
        last_action: recentJob ? `${recentJob.type} - ${recentJob.status}` : undefined,
        last_action_at: recentJob?.createdAt.toISOString() || null,
      };
    }

    return {
      status: 'RUNNING',
      last_action: recentJob ? `${recentJob.type} - ${recentJob.status}` : undefined,
      last_action_at: recentJob?.createdAt.toISOString() || null,
    };
  } catch (error) {
    logger.error('Error checking scheduler status:', error);
    return {
      status: 'STOPPED',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'engine.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw error;
    }

    // Check cache
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < cache.ttl) {
      return NextResponse.json(cache.data);
    }

    // Fetch engine status (AI, SEO, Ads)
    // Map to actual engine names in the system
    const engineMap: Record<string, string> = {
      AI: 'content-upgrade', // Main AI engine for content
      SEO: 'seo-titan', // SEO engine (or first SEO-related engine found)
      Ads: 'smart-ads-upgraded', // Ads engine
    };

    // Check all engines in parallel
    const [aiStatus, seoStatus, adsStatus] = await Promise.all([
      checkEngineHealth(engineMap.AI),
      checkEngineHealth(engineMap.SEO).catch(() => ({
        status: 'DOWN' as const,
        last_ok_at: null,
        reason: 'SEO engine not available',
      })),
      checkEngineHealth(engineMap.Ads),
    ]);

    // Get scheduler status
    const schedulerStatus = await getSchedulerStatus();

    const response = {
      AI: aiStatus,
      SEO: seoStatus,
      Ads: adsStatus,
      Scheduler: schedulerStatus,
      cached_until: new Date(now + cache.ttl).toISOString(),
    };

    // Update cache
    cache.data = response;
    cache.timestamp = now;

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching engine status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engine status' },
      { status: 500 }
    );
  }
}
