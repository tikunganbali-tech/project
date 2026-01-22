/**
 * STEP 23B-4 — ATTRIBUTION READ API (ADMIN, READ-ONLY)
 * 
 * GET /api/admin/marketing/attribution
 * 
 * 🔒 SECURITY:
 * - admin | super_admin ONLY
 * - READ-ONLY (no write, no trigger, no cache)
 * - Explainable & auditable
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as logger from '@/lib/logger';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// GET /api/admin/marketing/attribution
export async function GET(request: NextRequest) {
  try {
    // Validate role: admin or super_admin
    const session = await getServerSession();
    if (!session || !['admin', 'super_admin'].includes((session.user as any).role)) {
      logger.warn('Unauthorized access attempt to /api/admin/marketing/attribution');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Build query params for Go API
    const queryParams = new URLSearchParams();
    
    if (searchParams.get('campaignId')) {
      queryParams.set('campaignId', searchParams.get('campaignId')!);
    }
    
    if (searchParams.get('entityType')) {
      queryParams.set('entityType', searchParams.get('entityType')!);
    }
    
    if (searchParams.get('entityId')) {
      queryParams.set('entityId', searchParams.get('entityId')!);
    }
    
    if (searchParams.get('rule')) {
      const rule = searchParams.get('rule')!;
      if (['LAST_CLICK', 'FIRST_TOUCH', 'LINEAR'].includes(rule)) {
        queryParams.set('rule', rule);
      }
    }
    
    if (searchParams.get('windowDays')) {
      const windowDays = searchParams.get('windowDays')!;
      const days = parseInt(windowDays, 10);
      if (!isNaN(days) && days > 0) {
        queryParams.set('windowDays', windowDays);
      }
    }

    // Call Go engine-hub attribution API
    const url = `${GO_ENGINE_API_URL}/api/marketing/attribution?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // No cache as per requirements
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Go engine attribution API error:', { status: response.status, error: errorText });
      return NextResponse.json(
        { error: 'Failed to fetch attribution data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return response (already in correct format from Go API)
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error('Error fetching attribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribution data' },
      { status: 500 }
    );
  }
}

