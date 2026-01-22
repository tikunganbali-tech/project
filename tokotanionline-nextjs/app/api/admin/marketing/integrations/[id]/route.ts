/**
 * STEP 22A-2 - MARKETING INTEGRATION UPDATE API (WRITE CONFIG ONLY)
 * 
 * PUT /api/admin/marketing/integrations/[id]
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

// PUT /api/admin/marketing/integrations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn(`Unauthorized PUT attempt to /api/admin/marketing/integrations/${params.id}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Respect FEATURE_FREEZE - block writes if enabled
    if (FEATURE_FREEZE) {
      logger.warn(`PUT /api/admin/marketing/integrations/${params.id} blocked by FEATURE_FREEZE`);
      return NextResponse.json(
        { error: 'FEATURE_FREEZE is active. Config changes are blocked.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, isActive, credentials } = body;

    // Check if integration exists
    const existing = await prisma.marketingIntegration.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive === true;
    }

    if (credentials !== undefined) {
      updateData.credentials = credentials ? JSON.stringify(credentials) : null;
    }

    // Update integration
    const integration = await prisma.marketingIntegration.update({
      where: { id: params.id },
      data: updateData,
      include: {
        eventMaps: {
          orderBy: { eventKey: 'asc' },
        },
      },
    });

    logger.info(`Marketing integration updated: ${integration.id} (${integration.type})`);

    return NextResponse.json({ integration });
  } catch (error: any) {
    logger.error(`Error updating marketing integration ${params.id}:`, error);
    
    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Integration with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update marketing integration' },
      { status: 500 }
    );
  }
}

