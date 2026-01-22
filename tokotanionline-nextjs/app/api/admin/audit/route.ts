/**
 * STEP P1-3A - UNIFIED AUDIT TRAIL API (READ-ONLY)
 * 
 * GET /api/admin/audit
 * 
 * 🔒 PRINSIP KERAS:
 * ❌ Tidak ada POST
 * ❌ Tidak ada mutation
 * ❌ Tidak ada trigger
 * ✅ Hanya read
 * ✅ Hanya explain
 * ✅ Hanya observe
 * 
 * Menggabungkan semua sumber audit:
 * - ActionApproval (admin actions)
 * - ContentJob (engine decisions)
 * - MarketingEventLog (marketing events)
 * - EventLog (system events)
 * - BlogPost status changes (via EventLog)
 * 
 * 🔒 SECURITY:
 * - Auth required
 * - Permission: system.view
 * - Viewer, admin, super_admin boleh lihat
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertPermission } from '@/lib/permissions';

// Unified audit entry type
export interface UnifiedAuditEntry {
  id: string;
  timestamp: string;
  source: 'ADMIN' | 'ENGINE' | 'SYSTEM' | 'MARKETING';
  category: 'CONTENT' | 'PRODUCT' | 'MARKETING' | 'SYSTEM' | 'ACTION';
  action: string; // Human-readable action
  actor: string | null; // Who performed the action
  target: string | null; // What was affected
  status: 'SUCCESS' | 'SKIPPED' | 'BLOCKED' | 'PENDING' | 'FAILED';
  reason: string | null; // Human-readable reason
  metadata: Record<string, any>; // Additional context
  rawSource: string; // Original table/model name for reference
  rawId: string; // Original record ID
}

// Normalize ActionApproval to unified format
function normalizeActionApproval(action: any): UnifiedAuditEntry {
  const statusMap: Record<string, 'SUCCESS' | 'SKIPPED' | 'BLOCKED' | 'PENDING' | 'FAILED'> = {
    'PENDING': 'PENDING',
    'APPROVED': 'SUCCESS',
    'REJECTED': 'BLOCKED',
    'EXECUTED': 'SUCCESS',
  };

  let actionText = '';
  let reason: string | null = null;

  switch (action.status) {
    case 'PENDING':
      actionText = `Requested ${action.action} action for ${action.actionType}`;
      reason = 'Waiting for approval';
      break;
    case 'APPROVED':
      actionText = `Approved ${action.action} action for ${action.actionType}`;
      reason = action.approvedBy ? `Approved by ${action.approvedBy}` : 'Auto-approved';
      break;
    case 'REJECTED':
      actionText = `Rejected ${action.action} action for ${action.actionType}`;
      reason = 'Action was rejected';
      break;
    case 'EXECUTED':
      actionText = `Executed ${action.action} action for ${action.actionType}`;
      reason = action.executedAt ? 'Action completed successfully' : null;
      break;
  }

  return {
    id: `action-${action.id}`,
    timestamp: action.executedAt || action.approvedAt || action.createdAt,
    source: 'ADMIN',
    category: action.actionType === 'PRODUCT' ? 'PRODUCT' : 'CONTENT',
    action: actionText,
    actor: action.executedAt ? action.approvedBy || action.requestedBy : action.requestedBy,
    target: action.targetId || null,
    status: statusMap[action.status] || 'PENDING',
    reason,
    metadata: {
      actionId: action.actionId,
      actionType: action.actionType,
      priority: action.priority,
      hasTraces: action.traces?.length > 0,
    },
    rawSource: 'ActionApproval',
    rawId: action.id,
  };
}

// Normalize ContentJob to unified format
function normalizeContentJob(job: any): UnifiedAuditEntry {
  const statusMap: Record<string, 'SUCCESS' | 'SKIPPED' | 'BLOCKED' | 'PENDING' | 'FAILED'> = {
    'PENDING': 'PENDING',
    'RUNNING': 'PENDING',
    'DONE': 'SUCCESS',
    'FAILED': 'FAILED',
  };

  const typeMap: Record<string, string> = {
    'GENERATE': 'Generate content',
    'REFRESH': 'Refresh content',
    'OPTIMIZE': 'Optimize content',
  };

  let actionText = `${typeMap[job.type] || job.type} job`;
  let reason: string | null = null;

  if (job.status === 'DONE') {
    reason = job.finishedAt ? 'Job completed successfully' : 'Job finished';
  } else if (job.status === 'FAILED') {
    reason = 'Job failed during execution';
  } else if (job.status === 'RUNNING') {
    reason = 'Job is currently running';
  } else {
    reason = 'Job is pending execution';
  }

  return {
    id: `job-${job.id}`,
    timestamp: job.finishedAt || job.startedAt || job.createdAt,
    source: 'ENGINE',
    category: 'CONTENT',
    action: actionText,
    actor: job.requestedBy || 'system',
    target: job.params?.postId || job.params?.targetId || null,
    status: statusMap[job.status] || 'PENDING',
    reason,
    metadata: {
      jobType: job.type,
      scheduledAt: job.scheduledAt,
      executionTime: job.finishedAt && job.startedAt 
        ? new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
        : null,
    },
    rawSource: 'ContentJob',
    rawId: job.id,
  };
}

// Normalize MarketingEventLog to unified format
function normalizeMarketingEvent(event: any): UnifiedAuditEntry {
  const eventNameMap: Record<string, string> = {
    'page_view': 'Page viewed',
    'view_product': 'Product viewed',
    'add_to_cart': 'Added to cart',
    'purchase': 'Purchase completed',
    'search': 'Search performed',
  };

  return {
    id: `marketing-${event.id}`,
    timestamp: event.createdAt,
    source: 'MARKETING',
    category: 'MARKETING',
    action: eventNameMap[event.eventKey] || event.eventKey,
    actor: event.userId || event.sessionId || 'anonymous',
    target: event.entityId || null,
    status: 'SUCCESS', // Marketing events are always successful (logged)
    reason: `Event logged from ${event.source.toLowerCase()}`,
    metadata: {
      eventKey: event.eventKey,
      entityType: event.entityType,
      source: event.source,
    },
    rawSource: 'MarketingEventLog',
    rawId: event.id,
  };
}

// Normalize EventLog (system events) to unified format
function normalizeSystemEvent(event: any): UnifiedAuditEntry {
  const eventMap: Record<string, { action: string; category: 'CONTENT' | 'PRODUCT' | 'MARKETING' | 'SYSTEM' }> = {
    'system_settings_change': {
      action: 'System settings changed',
      category: 'SYSTEM',
    },
    'admin_created': {
      action: 'Admin user created',
      category: 'SYSTEM',
    },
    'admin_updated': {
      action: 'Admin user updated',
      category: 'SYSTEM',
    },
    'admin_deactivated': {
      action: 'Admin user deactivated',
      category: 'SYSTEM',
    },
    'admin_role_changed': {
      action: 'Admin role changed',
      category: 'SYSTEM',
    },
    'admin_status_changed': {
      action: 'Admin status changed',
      category: 'SYSTEM',
    },
    'website_settings_updated': {
      action: 'Website settings updated',
      category: 'SYSTEM',
    },
  };

  const eventInfo = eventMap[event.event] || {
    action: event.event,
    category: 'SYSTEM' as const,
  };

  const meta = typeof event.meta === 'string' 
    ? JSON.parse(event.meta || '{}')
    : event.meta || {};

  return {
    id: `system-${event.id}`,
    timestamp: event.createdAt,
    source: 'SYSTEM',
    category: eventInfo.category,
    action: eventInfo.action,
    actor: meta.changedBy || meta.createdBy || meta.updatedBy || 'system',
    target: meta.setting || meta.adminId || meta.userId || null,
    status: 'SUCCESS',
    reason: meta.reason || meta.message || null,
    metadata: meta,
    rawSource: 'EventLog',
    rawId: event.id,
  };
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
      assertPermission(userRole, 'system.view');
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
    const source = searchParams.get('source'); // ADMIN | ENGINE | SYSTEM | MARKETING
    const category = searchParams.get('category'); // CONTENT | PRODUCT | MARKETING | SYSTEM | ACTION
    const status = searchParams.get('status'); // SUCCESS | SKIPPED | BLOCKED | PENDING | FAILED

    // 📊 FETCH DATA FROM ALL SOURCES (in parallel)
    const [actions, jobs, marketingEvents, systemEvents] = await Promise.all([
      // ActionApproval
      prisma.actionApproval.findMany({
        take: limit * 2, // Get more to account for filtering
        orderBy: { createdAt: 'desc' },
        include: {
          traces: {
            take: 1, // Just check if traces exist
          },
        },
      }),

      // ContentJob
      prisma.contentJob.findMany({
        take: limit * 2,
        orderBy: { createdAt: 'desc' },
      }),

      // MarketingEventLog
      prisma.marketingEventLog.findMany({
        take: limit * 2,
        orderBy: { createdAt: 'desc' },
      }),

      // EventLog (system events)
      prisma.eventLog.findMany({
        where: {
          // Only get system events (not user tracking events)
          event: {
            in: [
              'system_settings_change', 
              'admin_created', 
              'admin_updated', 
              'admin_deactivated',
              'admin_role_changed',
              'admin_status_changed',
              'website_settings_updated',
            ],
          },
        },
        take: limit * 2,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 🔄 NORMALIZE ALL ENTRIES
    const allEntries: UnifiedAuditEntry[] = [
      ...actions.map(normalizeActionApproval),
      ...jobs.map(normalizeContentJob),
      ...marketingEvents.map(normalizeMarketingEvent),
      ...systemEvents.map(normalizeSystemEvent),
    ];

    // 🔍 APPLY FILTERS
    let filteredEntries = allEntries;

    if (source) {
      filteredEntries = filteredEntries.filter(e => e.source === source);
    }

    if (category) {
      filteredEntries = filteredEntries.filter(e => e.category === category);
    }

    if (status) {
      filteredEntries = filteredEntries.filter(e => e.status === status);
    }

    // 📅 SORT BY TIMESTAMP (newest first)
    filteredEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 📄 PAGINATION
    const total = filteredEntries.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

    // 📤 RESPONSE
    return NextResponse.json({
      success: true,
      data: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: endIndex < total,
      },
      filters: {
        source: source || null,
        category: category || null,
        status: status || null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch audit trail',
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
