/**
 * PHASE 6A — SYSTEM INTEGRATION CONFIGURATION BY ID
 * 
 * Endpoints:
 * - DELETE: Disable/delete integration config (SUPER ADMIN only)
 * 
 * Security:
 * - SUPER ADMIN only (system.manage permission)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/admin/system/integrations/config/[id]
 * Disable integration (doesn't delete config, just sets isEnabled=false)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json({ error: 'Forbidden: SUPER ADMIN only' }, { status: 403 });
    }

    const integrationId = params.id;

    // Get existing config
    const existing = await prisma.systemIntegrationConfig.findUnique({
      where: { integrationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Disable (don't delete config)
    const updated = await prisma.systemIntegrationConfig.update({
      where: { integrationId },
      data: {
        isEnabled: false,
        updatedBy: (session.user as any).id,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.integrationAuditLog.create({
      data: {
        integrationId: existing.id,
        action: 'DISABLE',
        changedBy: (session.user as any).id,
        changedByName: (session.user as any).name || (session.user as any).email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Integration disabled',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/system/integrations/config/[id]] Error:', error);
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
