/**
 * API Route: Test Auto Improve with Sample Data
 * Helper endpoint to test auto improve with default parameters
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
// SEO engine removed - non-core feature

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SEO engine removed - non-core feature
    return NextResponse.json({ 
      error: 'SEO engine has been removed as part of core system refactoring',
    }, { status: 410 });
  } catch (error: any) {
    console.error('Error testing auto improve:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test auto improve',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

