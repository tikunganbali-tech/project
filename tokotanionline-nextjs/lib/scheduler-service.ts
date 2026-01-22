/**
 * PHASE 6B — SCHEDULER SERVICE
 * 
 * Server-side scheduler untuk menjalankan task rutin
 * - Task terdaftar di DB (bukan hardcode)
 * - Interval bisa diatur via admin
 * - Observational only (tidak mengubah konten)
 */

import { prisma } from './db';

export interface TaskHandler {
  (taskKey: string): Promise<{ success: boolean; result?: any; error?: string }>;
}

class SchedulerService {
  private handlers: Map<string, TaskHandler> = new Map();
  private running: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 60000; // Check every minute

  /**
   * Register a task handler
   */
  registerTask(taskKey: string, handler: TaskHandler) {
    this.handlers.set(taskKey, handler);
  }

  /**
   * Start scheduler service
   */
  async start() {
    if (this.running) {
      console.log('[SCHEDULER] Already running');
      return;
    }

    this.running = true;
    console.log('[SCHEDULER] Service started');

    // Initial check
    await this.checkAndRunTasks();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAndRunTasks().catch((err) => {
        console.error('[SCHEDULER] Error in periodic check:', err);
      });
    }, this.checkInterval);
  }

  /**
   * Stop scheduler service
   */
  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SCHEDULER] Service stopped');
  }

  /**
   * Check and run tasks that are due
   */
  private async checkAndRunTasks() {
    try {
      const now = new Date();
      
      // Get enabled tasks that are due
      const tasks = await prisma.schedulerTask.findMany({
        where: {
          enabled: true,
          OR: [
            { nextRunAt: null }, // Never run
            { nextRunAt: { lte: now } }, // Due now
          ],
        },
      });

      for (const task of tasks) {
        // Skip if already running
        if (task.status === 'running') {
          continue;
        }

        // Run task
        await this.runTask(task);
      }
    } catch (error: any) {
      console.error('[SCHEDULER] Error checking tasks:', error);
    }
  }

  /**
   * Run a single task
   */
  private async runTask(task: any) {
    const startTime = Date.now();
    const handler = this.handlers.get(task.taskKey);

    if (!handler) {
      console.warn(`[SCHEDULER] No handler for task: ${task.taskKey}`);
      return;
    }

    // Mark as running
    await prisma.schedulerTask.update({
      where: { id: task.id },
      data: {
        status: 'running',
        lastRunAt: new Date(),
      },
    });

    // Create run log
    const runLog = await prisma.schedulerTaskRun.create({
      data: {
        taskId: task.id,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Execute task
      const result = await handler(task.taskKey);
      const durationMs = Date.now() - startTime;

      // Update task status
      const updateData: any = {
        status: result.success ? 'completed' : 'failed',
        lastError: result.error || null,
        lastResult: result.result || null,
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      };

      if (result.success) {
        updateData.successCount = { increment: 1 };
      } else {
        updateData.failureCount = { increment: 1 };
      }

      // Calculate next run
      const nextRunAt = new Date();
      nextRunAt.setMinutes(nextRunAt.getMinutes() + task.intervalMinutes);
      updateData.nextRunAt = nextRunAt;

      await prisma.schedulerTask.update({
        where: { id: task.id },
        data: updateData,
      });

      // Update run log
      await prisma.schedulerTaskRun.update({
        where: { id: runLog.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          finishedAt: new Date(),
          durationMs,
          result: result.result || null,
          error: result.error || null,
        },
      });

      console.log(`[SCHEDULER] Task ${task.taskKey} ${result.success ? 'completed' : 'failed'} in ${durationMs}ms`);
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      // Update task status
      await prisma.schedulerTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          lastError: errorMessage,
          runCount: { increment: 1 },
          failureCount: { increment: 1 },
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + task.intervalMinutes * 60 * 1000),
        },
      });

      // Update run log
      await prisma.schedulerTaskRun.update({
        where: { id: runLog.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          durationMs,
          error: errorMessage,
        },
      });

      console.error(`[SCHEDULER] Task ${task.taskKey} failed:`, errorMessage);
    }
  }

  /**
   * Initialize default tasks in database
   */
  async initializeTasks() {
    const defaultTasks = [
      {
        taskKey: 'health-check-integrations',
        name: 'Integration Health Check',
        description: 'Periodic health check for all integrations (observational only)',
        intervalMinutes: 60, // Every hour
      },
      {
        taskKey: 'analytics-aggregation',
        name: 'Analytics Aggregation',
        description: 'Aggregate analytics data (observational only)',
        intervalMinutes: 1440, // Daily
      },
      {
        taskKey: 'scheduler-alerts-check',
        name: 'Scheduler Alerts Check',
        description: 'Check for scheduler task failures and create alerts (observational only)',
        intervalMinutes: 30, // Every 30 minutes
      },
    ];

    for (const taskData of defaultTasks) {
      await prisma.schedulerTask.upsert({
        where: { taskKey: taskData.taskKey },
        create: {
          ...taskData,
          enabled: true,
          status: 'idle',
        },
        update: {
          // Don't update if already exists
        },
      });
    }

    console.log('[SCHEDULER] Default tasks initialized');
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getSchedulerService(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}
