/**
 * PHASE 6B — SCHEDULER SETUP
 * 
 * Initialize scheduler service dengan task handlers
 * Guardrails: Semua task observational only (tidak mengubah konten)
 */

import { getSchedulerService } from './scheduler-service';
import { healthCheckIntegrations } from './integration-health-check';
import { checkIntegrationAlerts, checkSchedulerAlerts } from './alerting-service';

/**
 * Setup scheduler dengan task handlers
 * GUARDRAIL: Semua task hanya observational, tidak mengubah konten
 */
export async function setupScheduler() {
  const scheduler = getSchedulerService();

  // Register: Health Check Integrations
  // GUARDRAIL: Observational only - hanya test connection, update health status
  scheduler.registerTask('health-check-integrations', async (taskKey) => {
    console.log(`[SCHEDULER] Running task: ${taskKey}`);
    
    // Health check (observational)
    const result = await healthCheckIntegrations();
    
    // Check for alerts (observational)
    await checkIntegrationAlerts();
    
    return result;
  });

  // Register: Analytics Aggregation (placeholder - observational only)
  // GUARDRAIL: Hanya aggregate data, tidak publish atau modify content
  scheduler.registerTask('analytics-aggregation', async (taskKey) => {
    console.log(`[SCHEDULER] Running task: ${taskKey}`);
    
    // TODO: Implement analytics aggregation (observational only)
    // This should only read and aggregate analytics data
    // NO content modification, NO publishing
    
    return {
      success: true,
      result: { message: 'Analytics aggregation not yet implemented' },
    };
  });

  // Register: Scheduler Alerts Check
  // GUARDRAIL: Observational only - hanya check dan create alerts
  scheduler.registerTask('scheduler-alerts-check', async (taskKey) => {
    console.log(`[SCHEDULER] Running task: ${taskKey}`);
    
    // Check scheduler alerts (observational)
    await checkSchedulerAlerts();
    
    return {
      success: true,
      result: { message: 'Scheduler alerts checked' },
    };
  });

  // Initialize default tasks in database
  await scheduler.initializeTasks();

  // Start scheduler
  await scheduler.start();

  console.log('[SCHEDULER] Setup complete');
}

/**
 * Guardrail check: Ensure task is observational
 * Throws error if task tries to modify content
 */
export function validateObservationalTask(taskKey: string, action: string) {
  const forbiddenActions = [
    'publish',
    'create',
    'update',
    'delete',
    'modify',
    'generate',
    'enqueue',
  ];

  const lowerAction = action.toLowerCase();
  if (forbiddenActions.some((forbidden) => lowerAction.includes(forbidden))) {
    throw new Error(
      `GUARDRAIL VIOLATION: Task ${taskKey} attempted to ${action}. ` +
      `Scheduler tasks must be observational only (read-only).`
    );
  }
}
