/**
 * Admin Dashboard Activity API
 * GET /api/admin/dashboard/activity?limit=10
 * 
 * Returns recent activity logs from ActivityLog table
 * Real data only (no dummy/seed data)
 * 
 * Requirements:
 * - Real activity data from ActivityLog
 * - Sorted by newest first
 * - Admin auth required
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// Helper: Get admin name by ID
async function getAdminName(adminId: string | null): Promise<string> {
  if (!adminId) return 'System';
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { name: true },
    });
    return admin?.name || 'Admin';
  } catch {
    return 'Admin';
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
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw error;
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50); // Max 50

    // Fetch activity logs (sorted by newest first)
    const activityLogs = await prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Enrich with admin names
    const enrichedActivities = await Promise.all(
      activityLogs.map(async (log) => {
        const actorName = await getAdminName(log.actorId);
        
        return {
          id: log.id,
          actor_id: log.actorId,
          actor_name: actorName,
          action: log.action,
          entity_type: log.entityType,
          entity_id: log.entityId,
          metadata: log.metadata,
          created_at: log.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      activities: enrichedActivities,
      count: enrichedActivities.length,
    });
  } catch (error: any) {
    logger.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
