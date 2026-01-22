/**
 * STEP 22A-2 - MARKETING INTEGRATIONS API (READ / WRITE CONFIG ONLY)
 * 
 * GET /api/admin/marketing/integrations
 * POST /api/admin/marketing/integrations
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

// GET /api/admin/marketing/integrations
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn('Unauthorized access attempt to /api/admin/marketing/integrations');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Respect FEATURE_FREEZE - read-only for non-super_admin (already checked above)
    const integrations = await prisma.marketingIntegration.findMany({
      include: {
        eventMaps: {
          orderBy: { eventKey: 'asc' },
        },
      },
      orderBy: { type: 'asc' },
    });

    return NextResponse.json({ integrations });
  } catch (error: any) {
    logger.error('Error fetching marketing integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing integrations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/marketing/integrations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn('Unauthorized POST attempt to /api/admin/marketing/integrations');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Respect FEATURE_FREEZE - block writes if enabled
    if (FEATURE_FREEZE) {
      logger.warn('POST /api/admin/marketing/integrations blocked by FEATURE_FREEZE');
      return NextResponse.json(
        { error: 'FEATURE_FREEZE is active. Config changes are blocked.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, name, isActive, credentials } = body;

    // Validation
    if (!type || !['FACEBOOK', 'GOOGLE', 'TIKTOK'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be FACEBOOK, GOOGLE, or TIKTOK' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create integration
    const integration = await prisma.marketingIntegration.create({
      data: {
        type,
        name: name.trim(),
        isActive: isActive === true,
        credentials: credentials ? JSON.stringify(credentials) : null,
      },
      include: {
        eventMaps: true,
      },
    });

    logger.info(`Marketing integration created: ${integration.id} (${type})`);

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating marketing integration:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Integration with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create marketing integration' },
      { status: 500 }
    );
  }
}

