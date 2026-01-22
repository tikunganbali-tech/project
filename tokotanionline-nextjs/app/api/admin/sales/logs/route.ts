/**
 * F6-C — OBSERVABILITY MINIMAL (OPS-FRIENDLY)
 * 
 * GET /api/admin/sales/logs
 * 
 * Fungsi: Query sales logs (ops-friendly)
 * 
 * Query params:
 * - event: Filter by event type (optional)
 * - productId: Filter by product ID (optional)
 * - limit: Number of results (default: 50, max: 200)
 * - since: ISO timestamp (optional)
 * 
 * Response:
 * {
 *   logs: Array<{ event, productId, metadata, timestamp }>,
 *   count: number
 * }
 * 
 * 🔒 SECURITY:
 * - Auth required
 * - Permission: system.view
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const eventFilter = searchParams.get('event');
    const productIdFilter = searchParams.get('productId');
    const limitParam = searchParams.get('limit');
    const sinceParam = searchParams.get('since');

    const limit = Math.min(
      Math.max(parseInt(limitParam || '50', 10) || 50, 1),
      200
    );

    // Build where clause
    const where: any = {
      event: {
        startsWith: 'sales_', // Only sales events
      },
    };

    if (eventFilter) {
      where.event = `sales_${eventFilter}`;
    }

    if (productIdFilter) {
      where.meta = {
        path: ['productId'],
        equals: productIdFilter,
      };
    }

    if (sinceParam) {
      try {
        const sinceDate = new Date(sinceParam);
        where.createdAt = {
          gte: sinceDate,
        };
      } catch (e) {
        // Invalid date, ignore
      }
    }

    // Query logs
    const logs = await prisma.eventLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        event: true,
        url: true,
        meta: true,
        createdAt: true,
      },
    });

    // Transform logs for easy reading
    const transformedLogs = logs.map((log: any) => {
      const meta = typeof log.meta === 'string' ? JSON.parse(log.meta) : log.meta;
      return {
        event: log.event.replace('sales_', ''), // Remove prefix
        productId: meta.productId || null,
        metadata: meta,
        timestamp: log.createdAt.toISOString(),
      };
    });

    // Count total (for today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const countToday = await prisma.eventLog.count({
      where: {
        ...where,
        createdAt: {
          gte: todayStart,
        },
      },
    });

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      count: transformedLogs.length,
      countToday,
    });
  } catch (error: any) {
    logger.error('Error fetching sales logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
