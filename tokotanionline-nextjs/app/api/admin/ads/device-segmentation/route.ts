/**
 * Device Segmentation API
 * Get and generate device behavior insights
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Device segmentation engine removed - non-core feature

// GET - Get device behavior insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const regenerate = searchParams.get('regenerate') === 'true';
    const priceSegment = searchParams.get('priceSegment') as 'retail_price_sensitive' | 'middle_consumptive' | 'premium_lifestyle' | null;
    const minConfidence = searchParams.get('minConfidence') ? parseInt(searchParams.get('minConfidence')!) : undefined;

    // Device segmentation engine removed - non-core feature
    return NextResponse.json({
      insights: [],
      count: 0,
      message: 'Device segmentation engine has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error getting device behavior insights:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get device behavior insights',
        insights: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

















