/**
 * Audience Clusters API
 * Get and generate audience clusters
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Audience cluster engine removed - non-core feature

// GET - Get audience clusters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const regenerate = searchParams.get('regenerate') === 'true';
    const minQualityScore = searchParams.get('minQualityScore') ? parseInt(searchParams.get('minQualityScore')!) : undefined;
    const k = searchParams.get('k') ? parseInt(searchParams.get('k')!) : undefined;

    // Audience cluster engine removed - non-core feature
    return NextResponse.json({
      clusters: [],
      count: 0,
      message: 'Audience cluster engine has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error getting audience clusters:', error);
    
    const errorMessage = error.message || error.toString() || 'Unknown error';
    
    // Check if it's a database/model issue
    const isTableMissing = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown model') ||
      errorMessage.includes('Cannot find model') ||
      errorMessage.includes('AnalyticsVisit') ||
      errorMessage.includes('AnalyticsSession') ||
      error.code === 'P2001';
    
    if (isTableMissing) {
      return NextResponse.json(
        {
          error: 'Analytics tables not found',
          message: 'Analytics tables not found. Please run: npx prisma db push',
          clusters: [],
          count: 0,
        },
        { status: 200 } // Return 200 with error message instead of 500
      );
    }
    
    return NextResponse.json(
      {
        error: errorMessage || 'Failed to get audience clusters',
        message: errorMessage,
        clusters: [],
        count: 0,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


