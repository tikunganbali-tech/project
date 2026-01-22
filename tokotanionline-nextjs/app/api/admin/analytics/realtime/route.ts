import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/admin/analytics/realtime
 * Get real-time analytics metrics
 * NOTE: Analytics integration dashboard is currently disabled
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      error: 'Analytics integration dashboard is currently disabled',
      metrics: null,
      trends: null,
      conversions: null,
      sources: null,
    }, { status: 503 });
  } catch (error: any) {
    console.error('Error fetching real-time analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch real-time analytics' },
      { status: 500 }
    );
  }
}

