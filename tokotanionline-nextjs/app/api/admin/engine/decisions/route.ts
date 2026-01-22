/**
 * STEP P1-3B - ENGINE DECISION INSPECTOR API (READ-ONLY)
 * 
 * GET /api/admin/engine/decisions
 * 
 * 🔒 PRINSIP KERAS:
 * ❌ Tidak ada HTTP outbound baru
 * ❌ Tidak ada adapter call
 * ❌ Tidak ada event resend
 * ❌ Tidak ada job baru
 * ❌ Tidak ada write DB
 * ❌ Tidak ada perubahan state
 * ✅ Read-only
 * ✅ Deterministic
 * ✅ Bisa diaudit
 * 
 * Menjawab pertanyaan "KENAPA" bukan "APA"
 * 
 * 🔒 SECURITY:
 * - Auth required
 * - Permission: engine.view
 * - Viewer, admin, super_admin boleh lihat
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertPermission } from '@/lib/permissions';

// Decision snapshot type (matches Go DecisionSnapshot)
export interface DecisionSnapshot {
  eventId: string;
  eventKey: string;
  entityType: string;
  entityId?: string | null;
  integration: string; // FACEBOOK, GOOGLE, TIKTOK
  decision: 'ALLOW' | 'SKIP';
  reason?: string | null;
  rule: string; // Human-readable rule name
  explanation: string; // Human-readable explanation
  timestamp: string;
  metadata?: Record<string, any>;
}

// Build decision snapshot from MarketingEventLog and audit data
function buildDecisionSnapshot(
  event: any,
  auditDecision: 'ALLOW' | 'SKIP' | null,
  auditReason: string | null
): DecisionSnapshot {
  const snapshot: DecisionSnapshot = {
    eventId: event.id,
    eventKey: event.eventKey,
    entityType: event.entityType,
    entityId: event.entityId,
    integration: 'UNKNOWN', // Will be determined from audit logs
    decision: auditDecision || 'SKIP',
    reason: auditReason,
    rule: 'Unknown',
    explanation: 'Decision information not available',
    timestamp: event.createdAt,
    metadata: {},
  };

  // Build human-readable explanation based on decision and reason
  if (auditDecision === 'ALLOW') {
    snapshot.rule = 'All checks passed';
    snapshot.explanation = `Event allowed to be sent. All dispatch rules passed (dedup, rate limit, enable checks).`;
  } else if (auditReason) {
    switch (auditReason) {
      case 'DEDUP_WINDOW':
        snapshot.rule = 'Deduplication (60s window)';
        snapshot.explanation = `Event skipped because a similar event was already sent within the last 60 seconds. This prevents duplicate events.`;
        snapshot.metadata = { dedupWindow: '60 seconds' };
        break;
      case 'RATE_LIMIT':
        snapshot.rule = 'Rate limit (30 events/minute)';
        snapshot.explanation = `Event skipped because the rate limit has been reached (30 events per minute). Please wait before sending more events.`;
        snapshot.metadata = { rateLimit: '30 events/minute' };
        break;
      case 'INTEGRATION_DISABLED':
        snapshot.rule = 'Integration disabled';
        snapshot.explanation = `Event skipped because the integration is currently disabled. Enable the integration to allow events.`;
        snapshot.metadata = { integrationStatus: 'disabled' };
        break;
      case 'EVENT_DISABLED':
        snapshot.rule = 'Event mapping disabled';
        snapshot.explanation = `Event skipped because the event mapping for '${event.eventKey}' is disabled. Enable the event mapping to allow this event.`;
        snapshot.metadata = { eventMappingStatus: 'disabled' };
        break;
      default:
        snapshot.rule = 'Unknown rule';
        snapshot.explanation = `Event skipped. Reason: ${auditReason}`;
    }
  } else {
    snapshot.rule = 'Unknown';
    snapshot.explanation = 'Event skipped, but no specific reason was recorded.';
  }

  return snapshot;
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'engine.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // 📥 PARSE QUERY PARAMETERS
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const eventKey = searchParams.get('eventKey');
    const entityId = searchParams.get('entityId');
    const integration = searchParams.get('integration'); // FACEBOOK, GOOGLE, TIKTOK
    const decision = searchParams.get('decision'); // ALLOW, SKIP
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    // 📊 BUILD WHERE CLAUSE
    const where: any = {};
    
    if (eventKey) {
      where.eventKey = eventKey;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }

    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) {
        where.createdAt.gte = new Date(startTime);
      }
      if (endTime) {
        where.createdAt.lte = new Date(endTime);
      }
    }

    // 📊 FETCH MARKETING EVENTS (read-only)
    const total = await prisma.marketingEventLog.count({ where });
    
    const events = await prisma.marketingEventLog.findMany({
      where,
      take: limit * 2, // Get more to account for filtering
      orderBy: { createdAt: 'desc' },
    });

    // 🔄 BUILD DECISION SNAPSHOTS
    // Note: In a real implementation, we would query Go engine-hub for audit logs
    // For now, we'll build snapshots from events with default decision logic
    // This is a simplified version - full implementation would integrate with Go engine-hub
    
    const snapshots: DecisionSnapshot[] = events.map(event => {
      // Default decision logic (would come from audit logs in full implementation)
      // For now, we'll use a placeholder
      const auditDecision: 'ALLOW' | 'SKIP' | null = null; // Would come from Go engine-hub
      const auditReason: string | null = null; // Would come from Go engine-hub
      
      // Build snapshot for each integration type
      // In real implementation, we'd have one snapshot per event+integration combination
      const integrations = integration ? [integration] : ['FACEBOOK', 'GOOGLE', 'TIKTOK'];
      
      return integrations.map(int => {
        const snapshot = buildDecisionSnapshot(event, auditDecision, auditReason);
        snapshot.integration = int;
        return snapshot;
      });
    }).flat();

    // 🔍 APPLY FILTERS
    let filteredSnapshots = snapshots;

    if (integration) {
      filteredSnapshots = filteredSnapshots.filter(s => s.integration === integration);
    }

    if (decision) {
      filteredSnapshots = filteredSnapshots.filter(s => s.decision === decision);
    }

    // 📅 SORT BY TIMESTAMP (newest first)
    filteredSnapshots.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 📄 PAGINATION
    const filteredTotal = filteredSnapshots.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSnapshots = filteredSnapshots.slice(startIndex, endIndex);

    // 📤 RESPONSE
    return NextResponse.json({
      success: true,
      data: paginatedSnapshots,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
        hasMore: endIndex < filteredTotal,
      },
      filters: {
        eventKey: eventKey || null,
        entityId: entityId || null,
        integration: integration || null,
        decision: decision || null,
        startTime: startTime || null,
        endTime: endTime || null,
      },
      note: 'This is a simplified implementation. Full version would integrate with Go engine-hub audit logs for complete decision history.',
    });
  } catch (error: any) {
    console.error('Error fetching decision snapshots:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch decision snapshots',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// ❌ EXPLICITLY BLOCK POST/PUT/DELETE
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint is read-only.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint is read-only.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint is read-only.' },
    { status: 405 }
  );
}
