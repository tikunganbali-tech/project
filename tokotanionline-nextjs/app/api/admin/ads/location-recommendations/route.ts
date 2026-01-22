/**
 * Location Recommendations API
 * Get location intelligence recommendations for ads
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Location intelligence engine removed - non-core feature

// GET - Get location recommendations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') as 'high' | 'medium' | 'test' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const recalculate = searchParams.get('recalculate') === 'true';

    // Location intelligence engine removed - non-core feature
    return NextResponse.json({
      recommendations: [],
      count: 0,
      priority: priority || 'all',
      message: 'Location intelligence engine has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error getting location recommendations:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get location recommendations',
        recommendations: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

















