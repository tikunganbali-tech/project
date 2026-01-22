/**
 * PHASE S: Scheduler Check API (Manual Trigger)
 * 
 * POST /api/admin/scheduler/check - Manually trigger scheduler check
 * 
 * PRINSIP KERAS:
 * - Endpoint ini hanya untuk manual trigger atau cron job
 * - Tidak ada auto-publish
 * - Hanya flagging content sebagai READY_TO_PUBLISH
 * - Publish tetap manual
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { checkScheduledContent, getScheduledContentSummary } from '@/lib/scheduler-engine';

// POST /api/admin/scheduler/check - Manually trigger scheduler check
export async function POST(request: NextRequest) {
  try {
    // Auth & permission check (optional - bisa juga dipanggil dari cron tanpa auth)
    // Untuk keamanan, tetap require auth
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run scheduler check
    const result = await checkScheduledContent();

    // Get summary
    const summary = await getScheduledContentSummary();

    return NextResponse.json({
      success: true,
      result,
      summary,
      message: 'Scheduler check completed. Content marked as READY_TO_PUBLISH still requires manual approval to publish.',
    });
  } catch (error: any) {
    console.error('Error in scheduler check:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduler check', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/scheduler/check - Get scheduler summary (no action, just status)
export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get summary only (no action)
    const summary = await getScheduledContentSummary();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Error getting scheduler summary:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler summary', message: error.message },
      { status: 500 }
    );
  }
}
