/**
 * STEP 20-3 - AI ADVISOR API
 * 
 * POST /api/admin/actions/[id]/advise
 * 
 * 🔒 SECURITY:
 * - super_admin only
 * - Read-only operation
 * - SAFE_MODE tidak relevan (read-only)
 * 
 * ❌ No DB write
 * ❌ No engine trigger
 * ❌ No side effects
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { buildExecutionSummary } from '@/lib/execution-summary';
import { generateAdvice } from '@/lib/ai-advisor';

export async function POST(
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
    // Build execution summary (read-only)
    const summary = await buildExecutionSummary(params.id);

    // Generate AI advice (read-only, no side effects)
    const advice = generateAdvice(summary);

    return NextResponse.json({
      success: true,
      advice,
    });
  } catch (error: any) {
    console.error('Error generating advice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate advice' },
      { status: 500 }
    );
  }
}

