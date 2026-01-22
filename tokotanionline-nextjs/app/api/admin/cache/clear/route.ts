/**
 * Clear Cache API
 * Clear all in-memory cache
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Cache manager removed - non-core feature

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache manager removed - non-core feature
    return NextResponse.json({
      success: false,
      message: 'Cache manager has been removed as part of core system refactoring',
      stats: {
        before: { total: 0 },
        after: { total: 0 },
        cleared: 0,
      },
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache manager removed - non-core feature
    return NextResponse.json({
      stats: { total: 0, message: 'Cache manager has been removed' },
    });
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}











