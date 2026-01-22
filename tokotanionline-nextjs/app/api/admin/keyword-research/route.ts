import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/auth';
// Keyword research removed - non-core feature

// GET /api/admin/keyword-research
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'best';
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const keyword = searchParams.get('keyword') || undefined;

    // Keyword research removed - non-core feature
    return NextResponse.json({ 
      error: 'Keyword research feature has been removed as part of core system refactoring',
      keywords: [],
      metrics: null,
    });
  } catch (error: any) {
    console.error('Keyword research error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}












