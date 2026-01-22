/**
 * STEP 22B-4 - ADMIN EVENT LOG API (READ-ONLY)
 * 
 * GET /api/admin/marketing/events/logs
 * 
 * Prinsip KERAS:
 * ❌ Tidak ada write
 * ❌ Tidak ada trigger
 * ❌ Tidak ada edit/delete
 * ✅ Read-only
 * ✅ Super cepat
 * ✅ Pagination wajib
 * 
 * 🔒 SECURITY:
 * - super_admin only
 * - Order: createdAt DESC
 * - Max limit: 100
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/marketing/events/logs
export async function GET(request: NextRequest) {
  try {
    // Guard: super_admin only
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Query params
    const eventKey = searchParams.get('eventKey') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const source = searchParams.get('source') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Build where clause
    const where: any = {};
    if (eventKey) {
      where.eventKey = eventKey;
    }
    if (entityType) {
      // Validate enum
      const validEntityTypes = ['PRODUCT', 'BLOG', 'PAGE', 'CART', 'ORDER', 'SEARCH'];
      if (validEntityTypes.includes(entityType)) {
        where.entityType = entityType;
      }
    }
    if (source) {
      // Validate enum
      const validSources = ['WEB', 'ENGINE', 'ADMIN'];
      if (validSources.includes(source)) {
        where.source = source;
      }
    }

    // Get total count for pagination
    const total = await prisma.marketingEventLog.count({ where });

    // Fetch events with pagination (order: createdAt DESC)
    const events = await prisma.marketingEventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        eventKey: true,
        entityType: true,
        entityId: true,
        payload: true,
        source: true,
        sessionId: true,
        userId: true,
        createdAt: true,
      },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching marketing event logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event logs' },
      { status: 500 }
    );
  }
}

