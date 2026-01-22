/**
 * Debug Error API
 * Get latest error information for debugging
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for common issues
    const issues: string[] = [];
    const checks: Record<string, any> = {};

    // Check 1: Cache manager
    try {
      // Cache manager removed - non-core feature
      const getCacheStats = null;
      checks.cacheManager = { error: 'Cache manager has been removed' };
    } catch (error: any) {
      issues.push(`Cache Manager: ${error.message}`);
      checks.cacheManager = { error: error.message };
    }

    // Check 2: Analytics aggregator (DISABLED - advanced analytics module isolated)
    // try {
    //   const { aggregateSessionsAndProduceMetrics } = await import('@/lib/analytics/aggregator');
    //   checks.analyticsAggregator = 'OK';
    // } catch (error: any) {
    //   issues.push(`Analytics Aggregator: ${error.message}`);
    //   checks.analyticsAggregator = { error: error.message };
    // }
    checks.analyticsAggregator = { status: 'disabled', message: 'Advanced analytics module isolated' };

    // Check 3: User behavior engine (removed - non-core)
    checks.userBehavior = { error: 'User behavior engine has been removed' };
    issues.push('User Behavior Engine: Feature removed');

    // Check 4: SEO Engine Controller (removed - non-core)
    checks.seoEngineController = { error: 'SEO Engine Controller has been removed' };
    issues.push('SEO Engine Controller: Feature removed');

    // Check 5: Auto-adset-generator (DISABLED - advanced analytics module isolated)
    // try {
    //   const { autoGenerateAdSets } = await import('@/lib/ads/auto-adset-generator');
    //   checks.autoAdsetGenerator = typeof autoGenerateAdSets === 'function';
    // } catch (error: any) {
    //   issues.push(`Auto AdSet Generator: ${error.message}`);
    //   checks.autoAdsetGenerator = { error: error.message };
    // }
    checks.autoAdsetGenerator = { status: 'disabled', message: 'Advanced analytics module isolated' };

    return NextResponse.json({
      status: issues.length === 0 ? 'healthy' : 'issues_found',
      issues,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Debug error API failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}











