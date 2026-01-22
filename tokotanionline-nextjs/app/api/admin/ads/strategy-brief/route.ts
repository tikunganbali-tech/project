/**
 * PHASE 8B.5: Strategy Brief API (READ-ONLY)
 * 
 * Provides content strategy briefs from SEO + Ads insights.
 * Admin can review and approve new version production.
 * NO manual text edit, NO auto-publish.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || '';
    const localeId = searchParams.get('localeId') || '';
    const pageId = searchParams.get('pageId') || '';

    // Get admin for brand access check
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // PHASE 8B: Guardrail - brand access check
    if (brandId && admin.role !== 'super_admin' && admin.brandId !== brandId) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 403 }
      );
    }

    // TODO: In production, this would call the Go engine to generate strategy brief
    // For now, return placeholder structure
    
    // In production, this would:
    // 1. Fetch SEO QC Report for pageId (if provided)
    // 2. Fetch Ads Strategy Report for brandId/localeId
    // 3. Call StrategySync.SyncStrategies()
    // 4. Return ContentStrategyBrief

    return NextResponse.json({
      briefs: [], // Placeholder - would contain actual strategy briefs
      readOnly: true, // PHASE 8B.5: Always read-only
      warning: 'This is a read-only strategy brief. No manual text edit, no auto-publish.',
    }, {
      headers: {
        'X-Read-Only': 'true', // PHASE 8B.5: Header indicating read-only
      },
    });
  } catch (error) {
    console.error('[Strategy Brief API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load strategy briefs' },
      { status: 500 }
    );
  }
}

// POST: Approve new version production (does NOT auto-publish)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pageId, strategyBriefId, action } = body;

    // PHASE 8B.5: Guardrail - only approve action, no auto-publish
    if (action !== 'approve_production') {
      return NextResponse.json(
        { error: 'Invalid action. Only approve_production is allowed.' },
        { status: 400 }
      );
    }

    // PHASE 8B.5: Approve production triggers new version generation
    // This does NOT auto-publish
    // This does NOT edit old version
    // This only signals approval for new version production

    // TODO: In production, this would:
    // 1. Store approval in database
    // 2. Trigger CONTENT_REVISION_REQUESTED event (if not already triggered)
    // 3. Queue new version generation
    // 4. Return approval confirmation

    return NextResponse.json({
      success: true,
      message: 'Production approved. New version will be generated (not auto-published).',
      readOnly: true, // PHASE 8B.5: Still read-only, no auto-publish
    }, {
      headers: {
        'X-Read-Only': 'true',
      },
    });
  } catch (error) {
    console.error('[Strategy Brief API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
