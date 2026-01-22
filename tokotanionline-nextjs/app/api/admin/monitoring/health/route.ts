import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/auth';
// Performance monitoring removed - non-core feature

/**
 * GET /api/admin/monitoring/health
 * Get system health metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'overview'; // overview, engines, api

    // Performance monitoring removed - non-core feature
    return NextResponse.json({ 
      error: 'Performance monitoring has been removed as part of core system refactoring',
      health: null,
      engines: [],
      api: null,
    });
  } catch (error: any) {
    console.error('Error fetching system health:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch system health' },
      { status: 500 }
    );
  }
}
















