/**
 * EKSEKUSI: Recheck Validation Endpoint
 * 
 * POST /api/admin/validate/recheck
 * 
 * Purpose: Trigger re-validation after AI generation completes
 * This endpoint calls the Go engine to recheck validation state
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

const ENGINE_HUB_URL = process.env.AI_ENGINE_URL || process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { entity, id } = body;

    if (!entity || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: entity and id' },
        { status: 400 }
      );
    }

    // Call Go engine recheck endpoint
    const result = await fetch(`${ENGINE_HUB_URL}/qc/recheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id }),
    }).catch((err) => {
      console.error('[VALIDATE-RECHECK] Error calling Go engine:', err);
      // Return INVALID status if engine call fails
      return { ok: false, status: 200, json: async () => ({ status: 'INVALID' }) };
    });

    if (!result.ok) {
      console.error('[VALIDATE-RECHECK] Go engine returned error:', result.status);
      return NextResponse.json({ status: 'INVALID' });
    }

    const response = await result.json().catch(() => ({ status: 'INVALID' }));
    // PHASE B: Return status from Go backend
    return NextResponse.json({ status: response.status || 'INVALID' });
  } catch (error: any) {
    console.error('[VALIDATE-RECHECK] Error:', error);
    // Return success even on error (non-blocking)
    return NextResponse.json({ ok: true, error: error.message });
  }
}
