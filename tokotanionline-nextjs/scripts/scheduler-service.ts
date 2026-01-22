/**
 * PHASE 6B — SCHEDULER SERVICE WORKER
 * 
 * Standalone scheduler service worker
 * Run via: npx tsx scripts/scheduler-service.ts
 * 
 * GUARDRAIL: Semua task observational only
 */

import { setupScheduler } from '../lib/scheduler-setup';

async function main() {
  console.log('[SCHEDULER-SERVICE] Starting scheduler service...');
  
  try {
    await setupScheduler();
    console.log('[SCHEDULER-SERVICE] Scheduler service started successfully');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('[SCHEDULER-SERVICE] Received SIGINT, shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('[SCHEDULER-SERVICE] Received SIGTERM, shutting down...');
      process.exit(0);
    });
  } catch (error: any) {
    console.error('[SCHEDULER-SERVICE] Failed to start:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
