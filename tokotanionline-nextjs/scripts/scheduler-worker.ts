#!/usr/bin/env tsx
/**
 * FASE 4 — SCHEDULER WORKER
 * 
 * Server-side worker untuk menjalankan scheduler automation
 * 
 * Usage:
 *   - Via cron: setiap 15 menit (cron expression: 0,15,30,45 * * * *)
 *   - Via systemd: Create service file and run as daemon
 *   - Manual: npx tsx scripts/scheduler-worker.ts
 * 
 * Prinsip:
 *   - Deterministik (jadwal & kuota jelas)
 *   - Fail-fast & logging jelas
 *   - Tidak ada batch liar
 *   - Tidak ada parallel execution
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3000';
const SCHEDULER_SERVICE_TOKEN = process.env.SCHEDULER_SERVICE_TOKEN || 'scheduler-internal-token-change-in-production';
const DRY_RUN = process.env.DRY_RUN === 'true';

interface TimeWindow {
  start: string; // HH:mm
  end: string; // HH:mm
}

/**
 * Parse time window string (e.g. "09:00-21:00")
 */
function parseTimeWindow(windowStr: string): TimeWindow | null {
  const parts = windowStr.split('-');
  if (parts.length !== 2) return null;
  return { start: parts[0].trim(), end: parts[1].trim() };
}

/**
 * Check if current time is within any of the time windows
 */
function isInTimeWindow(windows: string[]): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // minutes since midnight

  for (const windowStr of windows) {
    const window = parseTimeWindow(windowStr);
    if (!window) continue;

    const [startHour, startMin] = window.start.split(':').map(Number);
    const [endHour, endMin] = window.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime && currentTime < endTime) {
      return true;
    }
  }

  return false;
}

/**
 * Get topics/keywords for content generation
 * For now, we'll use a simple pool. In production, this should come from a keyword database.
 */
async function getNextTopic(type: 'blog' | 'product'): Promise<string | null> {
  // Try to get from BlogKeyword table if exists
  try {
    const keyword = await prisma.$queryRaw<Array<{ keyword: string }>>`
      SELECT keyword 
      FROM "BlogKeyword" 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `.catch(() => []);

    if (keyword && keyword.length > 0) {
      return keyword[0].keyword;
    }
  } catch (error) {
    // BlogKeyword table might not exist, continue with fallback
  }

  // Fallback: use a simple topic pool
  const blogTopics = [
    'pupuk organik',
    'pestisida alami',
    'teknik pertanian modern',
    'budidaya tanaman',
    'pengendalian hama',
  ];

  const productTopics = [
    'benih unggul',
    'alat pertanian',
    'pupuk cair',
  ];

  const topics = type === 'blog' ? blogTopics : productTopics;
  return topics[Math.floor(Math.random() * topics.length)];
}

/**
 * Execute a single content generation job
 */
async function executeContentGeneration(
  type: 'blog' | 'product',
  topic: string,
  runId: string
): Promise<{ success: boolean; contentId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/internal/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SCHEDULER_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({
        type,
        topic,
        language: 'id',
        runId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Generation failed' };
    }

    const result = await response.json();
    return { success: true, contentId: result.content?.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Main worker function
 */
async function runWorker() {
  console.log(`[SCHEDULER-WORKER] Starting worker at ${new Date().toISOString()}`);
  console.log(`[SCHEDULER-WORKER] DRY_RUN=${DRY_RUN}`);

  try {
    // Get scheduler config
    const config = await prisma.schedulerConfig.findFirst();
    
    if (!config) {
      console.log('[SCHEDULER-WORKER] No scheduler config found - skipping');
      return;
    }

    if (!config.enabled) {
      console.log('[SCHEDULER-WORKER] Scheduler is disabled - skipping');
      return;
    }

    // Check time window
    if (!isInTimeWindow(config.runWindows)) {
      console.log('[SCHEDULER-WORKER] Outside time window - skipping');
      return;
    }

    // Check daily quota
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const todayRuns = await prisma.schedulerRun.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const todayExecuted = todayRuns.reduce((sum, run) => sum + run.executedCount, 0);
    const remainingQuota = config.dailyQuota - todayExecuted;

    if (remainingQuota <= 0) {
      console.log(`[SCHEDULER-WORKER] Daily quota (${config.dailyQuota}) exceeded - skipping`);
      return;
    }

    // Check if there's a running job
    const runningRun = await prisma.schedulerRun.findFirst({
      where: {
        status: 'running',
      },
    });

    if (runningRun) {
      console.log('[SCHEDULER-WORKER] Another run is already in progress - skipping');
      return;
    }

    // Create new run record
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const run = await prisma.schedulerRun.create({
      data: {
        runId,
        date: now,
        plannedCount: Math.min(remainingQuota, 1), // Execute one at a time
        executedCount: 0,
        status: 'running',
        log: JSON.stringify({ startedAt: now.toISOString() }),
      },
    });

    console.log(`[SCHEDULER-WORKER] Created run: ${runId}, planned: ${run.plannedCount}`);

    try {
      // Determine content type based on contentMix
      const contentMix = config.contentMix ? JSON.parse(config.contentMix) : { blog: 3, product: 2 };
      const total = (contentMix.blog || 0) + (contentMix.product || 0);
      const blogRatio = (contentMix.blog || 0) / total;
      const type: 'blog' | 'product' = Math.random() < blogRatio ? 'blog' : 'product';

      // Get topic
      const topic = await getNextTopic(type);
      if (!topic) {
        throw new Error('No topic available');
      }

      console.log(`[SCHEDULER-WORKER] Generating ${type} content for topic: ${topic}`);

      if (DRY_RUN) {
        console.log('[SCHEDULER-WORKER] DRY_RUN: Would generate content (skipping actual generation)');
        await prisma.schedulerRun.update({
          where: { id: run.id },
          data: {
            executedCount: 1,
            status: 'done',
            finishedAt: new Date(),
            log: JSON.stringify({
              startedAt: now.toISOString(),
              finishedAt: new Date().toISOString(),
              dryRun: true,
              type,
              topic,
            }),
          },
        });
        return;
      }

      // Execute generation
      const result = await executeContentGeneration(type, topic, runId);

      if (result.success) {
        console.log(`[SCHEDULER-WORKER] Success: Generated ${type} content, id=${result.contentId}`);
        await prisma.schedulerRun.update({
          where: { id: run.id },
          data: {
            executedCount: 1,
            status: 'done',
            finishedAt: new Date(),
            log: JSON.stringify({
              startedAt: now.toISOString(),
              finishedAt: new Date().toISOString(),
              type,
              topic,
              contentId: result.contentId,
              success: true,
            }),
          },
        });
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error(`[SCHEDULER-WORKER] Error during execution:`, error);
      await prisma.schedulerRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          log: JSON.stringify({
            startedAt: now.toISOString(),
            finishedAt: new Date().toISOString(),
            error: error.message || 'Unknown error',
          }),
        },
      });
    }
  } catch (error: any) {
    console.error('[SCHEDULER-WORKER] Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run worker
if (require.main === module) {
  runWorker()
    .then(() => {
      console.log('[SCHEDULER-WORKER] Worker completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[SCHEDULER-WORKER] Worker failed:', error);
      process.exit(1);
    });
}

export { runWorker };
