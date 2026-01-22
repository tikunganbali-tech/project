/**
 * PHASE 6B — ALERTING SERVICE
 * 
 * Internal alerting system untuk notifikasi admin
 * - Alert trigger: Integration DOWN, Repeated ERROR
 * - Severity: INFO | WARNING | CRITICAL
 * - Channel: Admin dashboard notification
 */

import { prisma } from './db';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CreateAlertParams {
  alertKey: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  sourceType: 'INTEGRATION' | 'SCHEDULER' | 'SYSTEM';
  sourceId?: string;
  metadata?: any;
}

/**
 * Create or update an alert
 * If alert with same key exists and is ACTIVE, update it
 * Otherwise, create new alert
 */
export async function createAlert(params: CreateAlertParams): Promise<void> {
  try {
    const existing = await prisma.systemAlert.findFirst({
      where: {
        alertKey: params.alertKey,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      // Update existing alert
      await prisma.systemAlert.update({
        where: { id: existing.id },
        data: {
          title: params.title,
          message: params.message,
          severity: params.severity,
          metadata: params.metadata || null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new alert
      await prisma.systemAlert.create({
        data: {
          alertKey: params.alertKey,
          title: params.title,
          message: params.message,
          severity: params.severity,
          sourceType: params.sourceType,
          sourceId: params.sourceId || null,
          metadata: params.metadata || null,
          status: 'ACTIVE',
        },
      });
    }
  } catch (error: any) {
    console.error('[ALERTING] Error creating alert:', error);
  }
}

/**
 * Resolve an alert (mark as resolved)
 */
export async function resolveAlert(alertKey: string): Promise<void> {
  try {
    await prisma.systemAlert.updateMany({
      where: {
        alertKey,
        status: 'ACTIVE',
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('[ALERTING] Error resolving alert:', error);
  }
}

/**
 * Check for integration health issues and create alerts
 */
export async function checkIntegrationAlerts(): Promise<void> {
  try {
    const integrations = await prisma.systemIntegrationConfig.findMany({
      where: {
        isEnabled: true,
      },
    });

    for (const integration of integrations) {
      // Check if integration is down
      if (integration.healthStatus === 'ERROR') {
        await createAlert({
          alertKey: `integration-${integration.integrationId}-down`,
          title: `${integration.name} is Down`,
          message: integration.healthMessage || 'Integration health check failed',
          severity: 'CRITICAL',
          sourceType: 'INTEGRATION',
          sourceId: integration.id,
          metadata: {
            integrationId: integration.integrationId,
            lastChecked: integration.healthCheckedAt,
          },
        });
      } else if (integration.healthStatus === 'NOT_CONFIGURED' && integration.isEnabled) {
        await createAlert({
          alertKey: `integration-${integration.integrationId}-not-configured`,
          title: `${integration.name} Not Configured`,
          message: 'Integration is enabled but not configured',
          severity: 'WARNING',
          sourceType: 'INTEGRATION',
          sourceId: integration.id,
        });
      } else if (integration.healthStatus === 'CONNECTED') {
        // Resolve any existing alerts for this integration
        await resolveAlert(`integration-${integration.integrationId}-down`);
        await resolveAlert(`integration-${integration.integrationId}-not-configured`);
      }
    }
  } catch (error: any) {
    console.error('[ALERTING] Error checking integration alerts:', error);
  }
}

/**
 * Check for scheduler task failures and create alerts
 */
export async function checkSchedulerAlerts(): Promise<void> {
  try {
    const tasks = await prisma.schedulerTask.findMany({
      where: {
        enabled: true,
      },
    });

    for (const task of tasks) {
      // Check for repeated failures
      if (task.failureCount > 0 && task.runCount > 0) {
        const failureRate = task.failureCount / task.runCount;
        
        if (failureRate > 0.5 && task.runCount >= 3) {
          // More than 50% failure rate with at least 3 runs
          await createAlert({
            alertKey: `scheduler-${task.taskKey}-repeated-failure`,
            title: `Scheduler Task: ${task.name} - Repeated Failures`,
            message: `Task has failed ${task.failureCount} out of ${task.runCount} times. Last error: ${task.lastError || 'Unknown'}`,
            severity: failureRate > 0.8 ? 'CRITICAL' : 'WARNING',
            sourceType: 'SCHEDULER',
            sourceId: task.id,
            metadata: {
              taskKey: task.taskKey,
              failureCount: task.failureCount,
              runCount: task.runCount,
              lastError: task.lastError,
            },
          });
        }
      }

      // Check if task hasn't run in a while (stuck)
      if (task.status === 'running' && task.lastRunAt) {
        const lastRunAge = Date.now() - task.lastRunAt.getTime();
        const maxAge = task.intervalMinutes * 60 * 1000 * 2; // 2x interval

        if (lastRunAge > maxAge) {
          await createAlert({
            alertKey: `scheduler-${task.taskKey}-stuck`,
            title: `Scheduler Task: ${task.name} - Appears Stuck`,
            message: `Task has been running for more than ${Math.round(lastRunAge / 60000)} minutes`,
            severity: 'WARNING',
            sourceType: 'SCHEDULER',
            sourceId: task.id,
            metadata: {
              taskKey: task.taskKey,
              lastRunAt: task.lastRunAt,
              status: task.status,
            },
          });
        }
      }
    }
  } catch (error: any) {
    console.error('[ALERTING] Error checking scheduler alerts:', error);
  }
}
