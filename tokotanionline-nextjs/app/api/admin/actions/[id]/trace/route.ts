/**
 * STEP 19A-3 - ACTION TRACE API
 * 
 * GET /api/admin/actions/[id]/trace
 * 
 * 🔒 SECURITY:
 * - Auth required (super_admin)
 * - Read-only
 * - SAFE_MODE tidak relevan
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

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

  const traces = await prisma.actionTrace.findMany({
    where: {
      actionApprovalId: params.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({ traces });
}

