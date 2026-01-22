/**
 * STEP 19B-3 - ACTION SIMULATION API
 * 
 * GET /api/admin/actions/[id]/simulate
 * 
 * 🔒 SECURITY:
 * - super_admin only
 * - status = APPROVED
 * - SAFE_MODE boleh true (tidak relevan untuk read-only)
 * - Read-only operation
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { simulateAction } from '@/lib/action-simulator';

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

  // Fetch action
  const action = await prisma.actionApproval.findUnique({
    where: { id: params.id },
  });

  if (!action) {
    return NextResponse.json(
      { error: 'Action not found' },
      { status: 404 }
    );
  }

  // Guard: Only APPROVED actions can be simulated
  if (action.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Only APPROVED actions can be simulated' },
      { status: 400 }
    );
  }

  try {
    // Run simulation (read-only)
    const simulationResult = await simulateAction(
      action.actionType,
      action.action,
      action.targetId
    );

    return NextResponse.json({
      success: true,
      simulation: simulationResult,
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}

