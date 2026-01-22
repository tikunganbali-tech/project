/**
 * Master Decision Engine API
 * Get master decisions for pages
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Master decision engine removed - non-core feature

// GET - Get master decisions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const pageType = searchParams.get('pageType') as 'blog' | 'product' | 'category' | 'page' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const withPageInfo = searchParams.get('withPageInfo') === 'true';
    const forceRecalculate = searchParams.get('forceRecalculate') === 'true';

    // Master decision engine removed - non-core feature
    return NextResponse.json({ 
      error: 'Master decision engine has been removed as part of core system refactoring',
      decisions: [],
      total: 0,
    });
  } catch (error: any) {
    console.error('Error getting master decisions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get master decisions' },
      { status: 500 }
    );
  }
}











