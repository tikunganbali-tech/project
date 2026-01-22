/**
 * STEP 22A-2 - MARKETING EVENT UPDATE API (WRITE CONFIG ONLY)
 * 
 * PUT /api/admin/marketing/events/[id]
 * 
 * 🔒 SECURITY:
 * - super_admin ONLY
 * - Respect FEATURE_FREEZE
 * - Config only - NO event sending
 * - NO engine triggering
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FEATURE_FREEZE } from '@/lib/admin-config';
import * as logger from '@/lib/logger';

// PUT /api/admin/marketing/events/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn(`Unauthorized PUT attempt to /api/admin/marketing/events/${params.id}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Respect FEATURE_FREEZE - block writes if enabled
    if (FEATURE_FREEZE) {
      logger.warn(`PUT /api/admin/marketing/events/${params.id} blocked by FEATURE_FREEZE`);
      return NextResponse.json(
        { error: 'FEATURE_FREEZE is active. Config changes are blocked.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { externalEventName, enabled } = body;

    // Check if event exists
    const existing = await prisma.marketingEventMap.findUnique({
      where: { id: params.id },
      include: {
        integration: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (externalEventName !== undefined) {
      if (typeof externalEventName !== 'string' || externalEventName.trim().length === 0) {
        return NextResponse.json(
          { error: 'External event name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.externalEventName = externalEventName.trim();
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled === true;
    }

    // Update event
    const event = await prisma.marketingEventMap.update({
      where: { id: params.id },
      data: updateData,
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
    });

    logger.info(`Marketing event updated: ${event.id} (${event.integration.type}: ${event.eventKey})`);

    return NextResponse.json({ event });
  } catch (error: any) {
    logger.error(`Error updating marketing event ${params.id}:`, error);
    
    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update marketing event' },
      { status: 500 }
    );
  }
}

