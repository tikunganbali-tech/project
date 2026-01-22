/**
 * STEP 22A-2 - MARKETING EVENTS API (READ CONFIG ONLY)
 * 
 * GET /api/admin/marketing/events
 * 
 * 🔒 SECURITY:
 * - super_admin ONLY
 * - Respect FEATURE_FREEZE
 * - Read-only - NO event sending
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/marketing/events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn('Unauthorized access attempt to /api/admin/marketing/events');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    // Get all events, optionally filtered by integration
    const events = await prisma.marketingEventMap.findMany({
      where: integrationId ? { integrationId } : undefined,
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { integration: { type: 'asc' } },
        { eventKey: 'asc' },
      ],
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    logger.error('Error fetching marketing events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing events' },
      { status: 500 }
    );
  }
}

