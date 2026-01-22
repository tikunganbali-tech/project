/**
 * Keyword Intent Mapping API
 * Analyze keyword intent and map to platform interests
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Keyword intent engine removed - non-core feature

// GET - Get keyword intent mappings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean);
    const intent = searchParams.get('intent') as 'informational' | 'commercial' | 'transactional' | 'navigational' | null;
    const minConfidence = searchParams.get('minConfidence') ? parseInt(searchParams.get('minConfidence')!) : undefined;

    // Keyword intent engine removed - non-core feature
    return NextResponse.json({
      mappings: [],
      count: 0,
      message: 'Keyword intent engine has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error getting keyword intent mappings:', error);
    
    const errorMessage = error.message || error.toString() || 'Unknown error';
    
    // Check if it's a database/model issue
    const isTableMissing = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown model') ||
      errorMessage.includes('Cannot find model') ||
      errorMessage.includes('AnalyticsVisit') ||
      errorMessage.includes('AdsInterestMapping') ||
      error.code === 'P2001';
    
    if (isTableMissing) {
      return NextResponse.json(
        {
          error: 'Tables not found',
          message: 'Analytics or mapping tables not found. Please run: npx prisma db push',
          mappings: [],
          count: 0,
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      {
        error: errorMessage || 'Failed to get keyword intent mappings',
        message: errorMessage,
        mappings: [],
        count: 0,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Analyze keyword intent (single or batch)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, useOfficialAPI, dateFrom, dateTo } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    const dateFromDate = dateFrom ? new Date(dateFrom) : undefined;
    const dateToDate = dateTo ? new Date(dateTo) : undefined;

    // Keyword intent engine removed - non-core feature
    return NextResponse.json({
      mappings: [],
      count: 0,
      message: 'Keyword intent engine has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error analyzing keyword intent:', error);
    
    const errorMessage = error.message || error.toString() || 'Unknown error';
    
    // Check if it's a database/model issue
    const isTableMissing = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown model') ||
      errorMessage.includes('Cannot find model') ||
      errorMessage.includes('AnalyticsVisit') ||
      errorMessage.includes('AdsInterestMapping') ||
      error.code === 'P2001';
    
    if (isTableMissing) {
      return NextResponse.json(
        {
          error: 'Tables not found',
          message: 'Analytics or mapping tables not found. Please run: npx prisma db push',
          mappings: [],
          count: 0,
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      {
        error: errorMessage || 'Failed to analyze keyword intent',
        message: errorMessage,
        mappings: [],
        count: 0,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


