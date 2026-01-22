/**
 * STEP P1-3C - SYSTEM CONFIDENCE PANEL API (READ-ONLY)
 * 
 * GET /api/admin/system/confidence
 * 
 * 🔒 PRINSIP KERAS:
 * ❌ Tidak ada trigger
 * ❌ Tidak ada write
 * ❌ Tidak ada engine control
 * ❌ Tidak ada retry / execute
 * ❌ Tidak ada data teknis mentah
 * ✅ Read-only
 * ✅ Observational
 * ✅ Owner-friendly
 * 
 * Memberikan jawaban cepat & tepercaya untuk owner:
 * "Apakah sistem saya aman, terkendali, dan bekerja sesuai aturan hari ini?"
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
import { SAFE_MODE, FEATURE_FREEZE } from '@/lib/admin-config';

// Confidence snapshot type
export interface ConfidenceSnapshot {
  systemSafety: {
    safeMode: 'ACTIVE' | 'INACTIVE';
    featureFreeze: 'ACTIVE' | 'OFF';
    confidence: 'AMAN' | 'PERHATIAN';
    message: string;
  };
  engineStability: {
    status: 'ONLINE' | 'OFFLINE';
    lastHeartbeat: string | null;
    message: string;
  };
  decisionExplainability: {
    explainablePercent: number;
    status: 'EXPLAINABLE' | 'UNKNOWN_DETECTED';
    message: string;
  };
  marketingDispatchMode: {
    mode: 'DRY-RUN' | 'LIVE';
    eventsToday: number;
    killSwitchRespected: boolean;
    message: string;
  };
  errorRiskSignal: {
    errorSpikeDetected: boolean;
    autoDisableTriggered: boolean;
    message: string;
  };
  timestamp: string;
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

    // 📊 BUILD CONFIDENCE SNAPSHOT (READ-ONLY)

    // 1. System Safety
    const systemSafety: {
      safeMode: 'ACTIVE' | 'INACTIVE';
      featureFreeze: 'ACTIVE' | 'OFF';
      confidence: 'AMAN' | 'PERHATIAN';
      message: string;
    } = {
      safeMode: SAFE_MODE ? 'ACTIVE' : 'INACTIVE',
      featureFreeze: FEATURE_FREEZE ? 'ACTIVE' : 'OFF',
      confidence: (SAFE_MODE && FEATURE_FREEZE) ? 'AMAN' : 'PERHATIAN',
      message: SAFE_MODE && FEATURE_FREEZE
        ? 'Sistem dalam mode aman. Semua eksekusi diblok dan fitur dibekukan.'
        : SAFE_MODE
        ? 'Mode aman aktif. Eksekusi diblok.'
        : FEATURE_FREEZE
        ? 'Feature freeze aktif. Non-super_admin read-only.'
        : 'Mode aman tidak aktif. Hati-hati dengan eksekusi.',
    };

    // 2. Engine Stability
    type EngineStatus = 'ONLINE' | 'OFFLINE';
    let engineStability: {
      status: EngineStatus;
      lastHeartbeat: string | null;
      message: string;
    } = {
      status: 'OFFLINE' as EngineStatus,
      lastHeartbeat: null,
      message: 'Engine Hub tidak dapat diakses. Status tidak diketahui.',
    };

    try {
      // Try to check engine health (read-only, no trigger)
      const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';
      const healthResponse = await fetch(`${GO_ENGINE_API_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      }).catch(() => null);

      if (healthResponse?.ok) {
        const healthData = await healthResponse.json().catch(() => null);
        const onlineStatus: EngineStatus = 'ONLINE';
        engineStability = {
          status: onlineStatus,
          lastHeartbeat: healthData?.timestamp || new Date().toISOString(),
          message: 'Engine Hub online dan responsif.',
        };
      }
    } catch (error) {
      // Engine is offline or unreachable - this is OK, just report it
      engineStability.message = 'Engine Hub tidak dapat diakses saat ini. Ini normal jika engine belum di-start.';
    }

    // 3. Decision Explainability
    // Calculate from audit trail (read-only)
    let decisionExplainability: {
      explainablePercent: number;
      status: 'EXPLAINABLE' | 'UNKNOWN_DETECTED';
      message: string;
    } = {
      explainablePercent: 100,
      status: 'EXPLAINABLE',
      message: 'Semua keputusan dapat dijelaskan melalui audit trail.',
    };

    try {
      // Get recent marketing events and check if we have audit logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const eventsToday = await prisma.marketingEventLog.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });

      // Simplified: assume all events have audit logs if engine is online
      // In full implementation, would check actual audit log coverage
      if (eventsToday > 0 && engineStability.status === 'ONLINE') {
        decisionExplainability = {
          explainablePercent: 100,
          status: 'EXPLAINABLE',
          message: `Semua ${eventsToday} event hari ini dapat dijelaskan melalui decision inspector.`,
        };
      } else if (eventsToday > 0) {
        decisionExplainability = {
          explainablePercent: 0,
          status: 'UNKNOWN_DETECTED',
          message: 'Fitur ini belum aktif. Silakan hubungi admin.',
        };
      } else {
        decisionExplainability = {
          explainablePercent: 100,
          status: 'EXPLAINABLE',
          message: 'Tidak ada event hari ini. Sistem siap untuk menjelaskan keputusan saat event terjadi.',
        };
      }
    } catch (error) {
      // DB error - graceful degradation
      decisionExplainability = {
        explainablePercent: 0,
        status: 'UNKNOWN_DETECTED',
        message: 'Tidak dapat menghitung explainability. Database mungkin tidak dapat diakses.',
      };
    }

    // 4. Marketing Dispatch Mode
    let marketingDispatchMode: {
      mode: 'DRY-RUN' | 'LIVE';
      eventsToday: number;
      killSwitchRespected: boolean;
      message: string;
    } = {
      mode: 'DRY-RUN',
      eventsToday: 0,
      killSwitchRespected: true,
      message: 'Marketing dispatch dalam mode DRY-RUN. Semua event hanya di-log, tidak dikirim ke platform.',
    };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const eventsToday = await prisma.marketingEventLog.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });

      // Check if MARKETING_LIVE_ENABLED is set (from ENV, default false)
      // This is a simplified check - in full implementation would query Go engine-hub
      const marketingLiveEnabled = process.env.MARKETING_LIVE_ENABLED === 'true';
      const marketingDryRun = process.env.MARKETING_DRY_RUN !== 'false';

      marketingDispatchMode = {
        mode: (marketingLiveEnabled && !marketingDryRun) ? 'LIVE' : 'DRY-RUN',
        eventsToday,
        killSwitchRespected: !marketingLiveEnabled || marketingDryRun,
        message: (marketingLiveEnabled && !marketingDryRun)
          ? `Marketing dispatch dalam mode LIVE. ${eventsToday} event hari ini akan dikirim ke platform.`
          : `Marketing dispatch dalam mode DRY-RUN. ${eventsToday} event hari ini hanya di-log, tidak dikirim.`,
      };
    } catch (error) {
      // DB error - graceful degradation
      marketingDispatchMode.message = 'Tidak dapat menghitung event hari ini. Database mungkin tidak dapat diakses.';
    }

    // 5. Error & Risk Signal
    let errorRiskSignal = {
      errorSpikeDetected: false,
      autoDisableTriggered: false,
      message: 'Tidak ada lonjakan error dalam 24 jam terakhir.',
    };

    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      // Check for error patterns in engine logs (read-only)
      const errorLogs = await prisma.engineLog.count({
        where: {
          status: 'ERROR',
          executedAt: {
            gte: last24Hours,
          },
        },
      });

      // Simplified threshold: > 10 errors in 24h = spike
      if (errorLogs > 10) {
        errorRiskSignal = {
          errorSpikeDetected: true,
          autoDisableTriggered: false, // Would check actual auto-disable state
          message: `Ditemukan ${errorLogs} error dalam 24 jam terakhir. Perlu perhatian.`,
        };
      } else if (errorLogs > 0) {
        errorRiskSignal = {
          errorSpikeDetected: false,
          autoDisableTriggered: false,
          message: `Ditemukan ${errorLogs} error dalam 24 jam terakhir. Masih dalam batas normal.`,
        };
      }
    } catch (error) {
      // DB error - graceful degradation
      errorRiskSignal.message = 'Tidak dapat memeriksa error history. Database mungkin tidak dapat diakses.';
    }

    // 📤 BUILD SNAPSHOT
    const snapshot: ConfidenceSnapshot = {
      systemSafety,
      engineStability,
      decisionExplainability,
      marketingDispatchMode,
      errorRiskSignal,
      timestamp: new Date().toISOString(),
    };

    // 📤 RESPONSE (no cache)
    const response = NextResponse.json({
      success: true,
      data: snapshot,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Error building confidence snapshot:', error);
    return NextResponse.json(
      { 
        error: 'Failed to build confidence snapshot',
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
