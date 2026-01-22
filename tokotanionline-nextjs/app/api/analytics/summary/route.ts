/**
 * Analytics Summary API
 * STEP 7 - Analytics Ringkas (Read-Only)
 * GET /api/analytics/summary
 * Returns analytics summary from EventLog
 * Admin only - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getAnalyticsSummary } from '@/lib/analytics';
import * as logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Admin auth check - required
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      logger.warn('Unauthorized access attempt to /api/analytics/summary');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get analytics summary from EventLog
    const summary = await getAnalyticsSummary();

    return NextResponse.json(summary);
  } catch (error: any) {
    // Error handling with logger - don't leak error details
    logger.error('Error fetching analytics summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    );
  }
}
