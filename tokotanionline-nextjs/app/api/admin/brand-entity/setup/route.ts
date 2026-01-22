/**
 * API Route: Setup Brand Entity
 * Auto-create brand entity if not exists
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Brand entity removed - non-core feature

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Brand entity feature removed - non-core
    return NextResponse.json({
      error: 'Brand entity feature has been removed as part of core system refactoring',
    }, { status: 410 });
  } catch (error: any) {
    console.error('Error setting up brand entity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup brand entity' },
      { status: 500 }
    );
  }
}





