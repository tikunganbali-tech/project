/**
 * Centralized Engine Logging System
 * All engines must use this for observability
 */

import { prisma } from './db';

export type EngineName =
  | 'distribution'
  | 'user-behavior'
  | 'serp-feature'
  | 'authority'
  | 'local-seo'
  | 'content-upgrade'
  | 'brand-signal'
  | 'retention'
  | 'traffic-ignition'
  | 'ctr-optimization'
  | 'content-cluster'
  | 'return-visitor'
  | 'index-pressure'
  | 'image-intelligence'
  | 'image-engine'
  | 'smart-ads'
  | 'visitor-analytics'
  | 'location-intelligence'
  | 'keyword-intent'
  | 'audience-cluster'
  | 'device-segmentation'
  | 'auto-adset-generator'
  | 'smart-feedback-loop'
  | 'first-party-ads'
  | 'smart-ads-unified'
  | 'smart-ads-upgraded'
  | 'engine-test-suite'
  | 'blog-auto-injection'
  | 'ads-data-feed'
  | 'engine-registration-verifier'
  | 'failure-memory';

export type LogStatus = 'success' | 'warning' | 'failed' | 'skipped';
export type LogStatusDisplay = 'RUN' | 'UPDATE' | 'ERROR'; // Display format
export type ActionType = 'prepare' | 'execute' | 'complete' | 'error' | 'retry' | 'suspend' | 'info' | 'auto_fix' | 'duplicate_registration' | 'schedule_failed' | 'initialization_complete' | 'duplicate_schedule' | 'execute_task';

export interface LogMetadata {
  [key: string]: any;
  dataProcessedCount?: number; // Optional: can be in metadata or separate field
}

/**
 * Convert internal status to display format
 */
function statusToDisplay(status: LogStatus): LogStatusDisplay {
  switch (status) {
    case 'success':
      return 'RUN';
    case 'warning':
      return 'UPDATE';
    case 'failed':
      return 'ERROR';
    case 'skipped':
      return 'UPDATE';
    default:
      return 'RUN';
  }
}

/**
 * Log engine activity (async, non-blocking)
 * Format: Timestamp, Engine name, Status (RUN/UPDATE/ERROR), Data processed count
 */
export async function logEngineActivity(
  engineName: EngineName,
  options: {
    moduleName?: string;
    actionType: ActionType;
    relatedEntityId?: string;
    relatedEntityType?: 'blog' | 'product' | 'category' | 'page' | 'engine';
    status: LogStatus;
    message: string;
    metadata?: LogMetadata;
    executionTime?: number;
    error?: string;
    dataProcessedCount?: number; // Number of items/data processed
    result?: string; // Summary result for last run
  }
): Promise<void> {
  try {
    // Run async, don't block
    setImmediate(async () => {
      try {
        // Extract dataProcessedCount from metadata or use direct value
        const dataCount = options.dataProcessedCount || options.metadata?.dataProcessedCount || 0;
        
        // Clean metadata if dataProcessedCount was included
        const cleanMetadata = options.metadata ? { ...options.metadata } : {};
        if (cleanMetadata.dataProcessedCount) {
          delete cleanMetadata.dataProcessedCount;
        }

        await prisma.engineLog.create({
          data: {
            engineName,
            moduleName: options.moduleName,
            actionType: options.actionType,
            relatedEntityId: options.relatedEntityId,
            relatedEntityType: options.relatedEntityType,
            status: statusToDisplay(options.status), // Convert to RUN/UPDATE/ERROR
            message: options.message,
            metadata: Object.keys(cleanMetadata).length > 0 ? JSON.stringify(cleanMetadata) : null,
            dataProcessedCount: dataCount,
            executionTime: options.executionTime,
            error: options.error,
            executedAt: new Date(),
          },
        });

        // Update engine health
        await updateEngineHealth(
          engineName,
          options.status,
          options.executionTime,
          options.error,
          options.result,
          dataCount
        );
      } catch (error) {
        // Silent fail - don't break main flow
        console.error('Error logging engine activity:', error);
      }
    });
  } catch (error) {
    // Silent fail
    console.error('Error in logEngineActivity:', error);
  }
}

/**
 * Update engine health status
 */
async function updateEngineHealth(
  engineName: EngineName,
  status: LogStatus,
  executionTime?: number,
  error?: string,
  result?: string,
  dataProcessedCount: number = 0
): Promise<void> {
  try {
    const health = await prisma.engineHealth.findUnique({
      where: { engineName },
    });

    const now = new Date();
    const updates: any = {
      lastRunAt: now,
      updatedAt: now,
    };

    if (status === 'success') {
      updates.lastSuccessAt = now;
      updates.successCount = { increment: 1 };
    } else if (status === 'warning') {
      updates.warningCount = { increment: 1 };
    } else if (status === 'failed') {
      updates.lastFailureAt = now;
      updates.failureCount = { increment: 1 };
      if (error) {
        updates.lastError = error;
      }
    }

    if (executionTime) {
      // Calculate average execution time
      const currentAvg = health?.avgExecutionTime || 0;
      const currentCount = (health?.successCount || 0) + (health?.warningCount || 0);
      if (currentCount > 0) {
        updates.avgExecutionTime = Math.round(
          (currentAvg * currentCount + executionTime) / (currentCount + 1)
        );
      } else {
        updates.avgExecutionTime = executionTime;
      }
    }

    // Calculate error rate (last 100 logs)
    const recentLogs = await prisma.engineLog.findMany({
      where: {
        engineName,
        executedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      take: 100,
    });

    if (recentLogs.length > 0) {
      const failedCount = recentLogs.filter((l) => l.status === 'ERROR').length;
      updates.errorRate = (failedCount / recentLogs.length) * 100;
    }

    // Determine health status and active status
    if (updates.errorRate > 10 || (health && !health.lastSuccessAt)) {
      updates.status = 'critical';
      updates.isActive = false; // Mark as inactive if critical
    } else if (updates.errorRate > 5 || (health && !health.lastSuccessAt && Date.now() - health.lastRunAt!.getTime() > 48 * 60 * 60 * 1000)) {
      updates.status = 'warning';
      updates.isActive = true; // Still active but warning
    } else {
      updates.status = 'healthy';
      updates.isActive = true;
    }

    // Check if engine hasn't run in 48 hours - mark as inactive
    if (health?.lastRunAt) {
      const hoursSinceLastRun = (Date.now() - health.lastRunAt.getTime()) / (60 * 60 * 1000);
      if (hoursSinceLastRun > 48 && status !== 'success') {
        updates.isActive = false;
      }
    }

    await prisma.engineHealth.upsert({
      where: { engineName },
      create: {
        engineName,
        ...updates,
        successCount: status === 'success' ? 1 : 0,
        warningCount: status === 'warning' ? 1 : 0,
        failureCount: status === 'failed' ? 1 : 0,
        totalDataProcessed: dataProcessedCount || 0,
        lastDataProcessed: dataProcessedCount || 0,
      },
      update: updates,
    });

    // Check if alert needed
    if (updates.status === 'critical' || updates.status === 'warning') {
      await checkAndCreateAlert(engineName, updates.status, error);
    }
  } catch (error) {
    console.error('Error updating engine health:', error);
  }
}

/**
 * Check and create alerts if needed
 */
async function checkAndCreateAlert(
  engineName: EngineName,
  status: 'warning' | 'critical',
  error?: string
): Promise<void> {
  try {
    // Check if alert already exists
    const existingAlert = await prisma.engineAlert.findFirst({
      where: {
        engineName,
        alertType: status,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Only create new alert if last one is older than 1 hour
    if (existingAlert) {
      const hoursSinceLastAlert = (Date.now() - existingAlert.createdAt.getTime()) / (60 * 60 * 1000);
      if (hoursSinceLastAlert < 1) {
        return; // Don't spam alerts
      }
    }

    const title = status === 'critical'
      ? `🚨 Critical: ${engineName} engine is down`
      : `⚠️ Warning: ${engineName} engine has issues`;

    const message = status === 'critical'
      ? `The ${engineName} engine has failed repeatedly or has not run successfully in over 48 hours. ${error ? `Error: ${error}` : ''}`
      : `The ${engineName} engine has warnings or delays. Error rate: ${error ? error.substring(0, 200) : 'N/A'}`;

    await prisma.engineAlert.create({
      data: {
        engineName,
        alertType: status,
        title,
        message,
        status: 'active',
        metadata: JSON.stringify({ error }),
      },
    });
  } catch (error) {
    console.error('Error creating alert:', error);
  }
}

/**
 * Get engine logs with pagination
 */
export async function getEngineLogs(options: {
  engineName?: EngineName;
  status?: LogStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    engineName,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;

  const where: any = {};

  if (engineName) where.engineName = engineName;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.executedAt = {};
    if (startDate) where.executedAt.gte = startDate;
    if (endDate) where.executedAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.engineLog.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.engineLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      // Status is already in RUN/UPDATE/ERROR format
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get engine health status
 */
export async function getEngineHealth(engineName?: EngineName) {
  if (engineName) {
    return prisma.engineHealth.findUnique({
      where: { engineName },
    });
  }
  return prisma.engineHealth.findMany({
    orderBy: { engineName: 'asc' },
  });
}

/**
 * Get active alerts
 */
export async function getActiveAlerts(engineName?: EngineName) {
  const where: any = { status: 'active' };
  if (engineName) where.engineName = engineName;

  return prisma.engineAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Acknowledge alert
 */
export async function acknowledgeAlert(alertId: string) {
  return prisma.engineAlert.update({
    where: { id: alertId },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    },
  });
}

/**
 * Resolve alert
 */
export async function resolveAlert(alertId: string) {
  return prisma.engineAlert.update({
    where: { id: alertId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
    },
  });
}






