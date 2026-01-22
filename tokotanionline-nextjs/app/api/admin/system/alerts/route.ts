/**
 * PHASE 6B — SYSTEM ALERTS API
 * 
 * GET: List alerts
 * PUT: Acknowledge alert
 * 
 * Permission: system.view (GET), SUPER ADMIN (PUT)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission, isSuperAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/system/alerts
 * List alerts
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    assertPermission(userRole, 'system.view');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ACTIVE';
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }

    const alerts = await prisma.systemAlert.findMany({
      where,
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      alerts: alerts.map((a) => ({
        id: a.id,
        alertKey: a.alertKey,
        title: a.title,
        message: a.message,
        severity: a.severity,
        sourceType: a.sourceType,
        sourceId: a.sourceId,
        status: a.status,
        acknowledgedBy: a.acknowledgedBy,
        acknowledgedAt: a.acknowledgedAt?.toISOString(),
        resolvedAt: a.resolvedAt?.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/system/alerts] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/system/alerts
 * Acknowledge or resolve alert
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json({ error: 'Forbidden: SUPER ADMIN only' }, { status: 403 });
    }

    const body = await req.json();
    const { alertId, action } = body; // action: 'acknowledge' | 'resolve'

    if (!alertId || !action) {
      return NextResponse.json({ error: 'alertId and action are required' }, { status: 400 });
    }

    const updateData: any = {};
    if (action === 'acknowledge') {
      updateData.status = 'ACKNOWLEDGED';
      updateData.acknowledgedBy = (session.user as any).id;
      updateData.acknowledgedAt = new Date();
    } else if (action === 'resolve') {
      updateData.status = 'RESOLVED';
      updateData.resolvedAt = new Date();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.systemAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      alert: updated,
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/system/alerts] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
