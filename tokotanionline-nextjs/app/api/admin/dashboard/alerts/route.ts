/**
 * Admin Dashboard Alerts API
 * GET /api/admin/dashboard/alerts
 * 
 * Returns system alerts:
 * - Engine DOWN
 * - SMTP not configured
 * - Drafts piling up (> N days)
 * - Error rate increased
 * 
 * Requirements:
 * - Real alerts only (no placeholders)
 * - Admin auth required
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getEngineHealth, getActiveAlerts } from '@/lib/engine-logger';
import * as logger from '@/lib/logger';

interface Alert {
  id: string;
  type: 'engine_down' | 'smtp_not_configured' | 'drafts_piling' | 'error_rate' | 'other';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw error;
    }

    const alerts: Alert[] = [];

    // 1. Check for engine DOWN alerts
    try {
      const engineAlerts = await getActiveAlerts();
      for (const alert of engineAlerts) {
        if (alert.status === 'active' && (alert.alertType === 'critical' || alert.alertType === 'warning')) {
          alerts.push({
            id: `engine_${alert.id}`,
            type: 'engine_down',
            severity: alert.alertType === 'critical' ? 'critical' : 'warning',
            title: alert.title || `Engine ${alert.engineName} ${alert.alertType}`,
            message: alert.message || `Engine ${alert.engineName} has issues`,
            metadata: {
              engineName: alert.engineName,
              alertId: alert.id,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error checking engine alerts:', error);
    }

    // 2. Check for SMTP not configured (check environment or config)
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      if (!smtpHost || !smtpUser) {
        alerts.push({
          id: 'smtp_not_configured',
          type: 'smtp_not_configured',
          severity: 'warning',
          title: 'SMTP belum terkonfigurasi',
          message: 'Konfigurasi SMTP diperlukan untuk mengirim email. Beberapa fitur mungkin tidak berfungsi.',
        });
      }
    } catch (error) {
      // Ignore SMTP check errors
    }

    // 3. Check for drafts piling up (> 7 days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [oldDraftProducts, oldDraftPosts] = await Promise.all([
        prisma.product.count({
          where: {
            OR: [
              { status: 'DRAFT' },
              { status: null },
            ],
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        }).catch(() => 0),
        prisma.blogPost.count({
          where: {
            status: 'DRAFT',
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        }).catch(() => 0),
      ]);

      const totalOldDrafts = oldDraftProducts + oldDraftPosts;
      if (totalOldDrafts > 0) {
        alerts.push({
          id: 'drafts_piling',
          type: 'drafts_piling',
          severity: totalOldDrafts > 20 ? 'warning' : 'info',
          title: `${totalOldDrafts} draft menumpuk > 7 hari`,
          message: `${oldDraftProducts} produk dan ${oldDraftPosts} artikel masih dalam draft lebih dari 7 hari.`,
          metadata: {
            oldDraftProducts,
            oldDraftPosts,
          },
        });
      }
    } catch (error) {
      logger.error('Error checking draft backlog:', error);
    }

    // 4. Check for high error rate (from engine health)
    try {
      const allHealth = await getEngineHealth();
      const engines = Array.isArray(allHealth) ? allHealth : [allHealth].filter(Boolean);
      
      for (const engine of engines) {
        if (engine && engine.errorRate && engine.errorRate > 10) {
          alerts.push({
            id: `error_rate_${engine.engineName}`,
            type: 'error_rate',
            severity: engine.errorRate > 20 ? 'critical' : 'warning',
            title: `Error rate tinggi: ${engine.engineName}`,
            message: `Engine ${engine.engineName} memiliki error rate ${engine.errorRate.toFixed(1)}% (lebih dari 10%)`,
            metadata: {
              engineName: engine.engineName,
              errorRate: engine.errorRate,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error checking error rates:', error);
    }

    // Sort by severity (critical > warning > info)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      alerts,
      count: alerts.length,
      critical_count: alerts.filter(a => a.severity === 'critical').length,
      warning_count: alerts.filter(a => a.severity === 'warning').length,
    });
  } catch (error: any) {
    logger.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
