#!/usr/bin/env node
/**
 * E1.3 — HARD ISOLATION ENGINE RUNNER
 * 
 * Standalone Node.js process untuk SEO Engine
 * TIDAK BAGIAN DARI Next.js Runtime
 * 
 * Usage:
 *   node engine/runner.js
 *   pm2 start engine/runner.js --name seo-engine
 */

import * as path from 'path';
import * as fs from 'fs/promises';

// Path configuration
// Use process.cwd() for correct path resolution when running from project root
const ENGINE_ROOT = path.join(process.cwd(), 'engine');
const STORAGE_ROOT = path.join(ENGINE_ROOT, 'storage');
const CONFIG_FILE = path.join(STORAGE_ROOT, 'engine-config.json');
const HEALTH_FILE = path.join(STORAGE_ROOT, 'health.json');
const STATUS_FILE = path.join(STORAGE_ROOT, 'status.json');
const QUEUE_FILE = path.join(STORAGE_ROOT, 'queue.json');
const ANALYTICS_FILE = path.join(STORAGE_ROOT, 'analytics.json');

// Ensure storage directory exists
async function ensureStorage() {
  try {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
    process.exit(1);
  }
}

// Initialize health status
async function initializeHealth() {
  const health = {
    engine: 'idle',
    lastRun: null,
    lastSuccess: null,
    status: 'ok',
    uptime: Date.now(),
    version: '1.0.0',
  };

  try {
    await fs.writeFile(HEALTH_FILE, JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('Failed to initialize health file:', error);
  }
}

// Update health status
async function updateHealth(update: Partial<{
  engine: string;
  lastRun: string | null;
  lastSuccess: string | null;
  status: string;
  uptime: number;
  version: string;
}>) {
  try {
    let health: any = {};
    try {
      const data = await fs.readFile(HEALTH_FILE, 'utf-8');
      health = JSON.parse(data);
    } catch {
      // File doesn't exist, use defaults
    }

    health = {
      ...health,
      ...update,
      lastUpdate: new Date().toISOString(),
    };

    await fs.writeFile(HEALTH_FILE, JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('Failed to update health:', error);
  }
}

// Load engine modules dynamically (from lib/seo-engine)
async function loadEngineModules() {
  try {
    // Resolve path to lib/seo-engine using absolute path
    const libPath = path.join(process.cwd(), 'lib', 'seo-engine');
    
    // Dynamic import with absolute path to avoid bundling with Next.js
    const controllerModule = await import(path.resolve(libPath, 'controller'));
    const registerModule = await import(path.resolve(libPath, 'register-engines'));
    const schedulerModule = await import(path.resolve(libPath, 'scheduler'));
    
    return {
      controller: controllerModule.seoEngineController,
      registerAllEngines: registerModule.registerAllEngines,
      initializeScheduledTasks: schedulerModule.initializeScheduledTasks,
    };
  } catch (error) {
    console.error('Failed to load engine modules:', error);
    throw error;
  }
}

// Process queue from file
async function processQueue() {
  try {
    let queue: any[] = [];
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf-8');
      queue = JSON.parse(data);
    } catch {
      // Queue file doesn't exist, create empty
      await fs.writeFile(QUEUE_FILE, JSON.stringify([], null, 2));
      return;
    }

    if (queue.length === 0) {
      return;
    }

    const { controller } = await loadEngineModules();
    
    // Process items (batch)
    const batch = queue.splice(0, 10); // Process max 10 at a time
    
    for (const item of batch) {
      try {
        await updateHealth({ engine: 'running', lastRun: new Date().toISOString() });
        
        const result = await controller.executeEngine(
          item.engineName,
          item.taskType,
          item.params
        );

        if (result.success) {
          await updateHealth({ lastSuccess: new Date().toISOString() });
        }
      } catch (error: any) {
        console.error(`Failed to execute ${item.engineName}.${item.taskType}:`, error.message);
      }
    }

    // Save remaining queue
    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (error) {
    console.error('Failed to process queue:', error);
  } finally {
    await updateHealth({ engine: 'idle' });
  }
}

// Main runner loop
async function main() {
  console.log('🚀 SEO Engine Runner - Starting...');
  
  await ensureStorage();
  await initializeHealth();
  
  // Initialize analytics writer
  try {
    const { initializeAnalyticsWriter } = await import('./analytics');
    initializeAnalyticsWriter();
  } catch (error) {
    console.warn('⚠️ Failed to initialize analytics writer:', error);
  }
  
  // Load and register engines
  try {
    const { registerAllEngines, initializeScheduledTasks } = await loadEngineModules();
    registerAllEngines();
    await initializeScheduledTasks();
    console.log('✅ Engines registered and scheduled');
  } catch (error) {
    console.error('❌ Failed to initialize engines:', error);
    await updateHealth({ status: 'error', engine: 'error' });
    process.exit(1);
  }

  // Process queue every 30 seconds
  setInterval(async () => {
    await processQueue();
  }, 30000);

  // Process immediately
  await processQueue();

  // Update health status periodically
  setInterval(async () => {
    await updateHealth({ status: 'ok' });
  }, 60000); // Every minute

  console.log('✅ SEO Engine Runner - Ready');
  console.log(`📁 Storage: ${STORAGE_ROOT}`);
  console.log(`💚 Health: ${HEALTH_FILE}`);
  
  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    await updateHealth({ engine: 'stopped', status: 'stopping' });
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down...');
    await updateHealth({ engine: 'stopped', status: 'stopping' });
    process.exit(0);
  });
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

