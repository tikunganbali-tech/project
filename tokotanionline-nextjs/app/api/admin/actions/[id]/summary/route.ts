/**
 * STEP 19C-1 - EXECUTION SUMMARY API
 * 
 * GET /api/admin/actions/[id]/summary
 * 
 * Returns execution summary combining:
 * - Action info
 * - ActionTrace (WHY)
 * - Simulation result (WHAT IF)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { buildExecutionSummary } from '@/lib/execution-summary';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Forbidden') ? 403 : 401 }
    );
  }

  try {
    const summary = await buildExecutionSummary(params.id);
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Error building execution summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to build summary' },
      { status: 500 }
    );
  }
}

