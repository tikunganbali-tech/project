/**
 * E1.3 — ENGINE ANALYTICS WRITER
 * 
 * Batch, async, delayed analytics writer
 * Engine menulis analytics ke file, Admin membaca dari file
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const ANALYTICS_FILE = path.join(process.cwd(), 'engine', 'storage', 'analytics.json');
const ANALYTICS_BUFFER: any[] = [];
const FLUSH_INTERVAL = 60000; // Flush every minute
const MAX_BUFFER_SIZE = 100;

interface AnalyticsEvent {
  timestamp: string;
  engine: string;
  action: string;
  data: any;
}

/**
 * Add analytics event to buffer (non-blocking)
 */
export function recordAnalytics(engine: string, action: string, data: any): void {
  ANALYTICS_BUFFER.push({
    timestamp: new Date().toISOString(),
    engine,
    action,
    data,
  });

  // Auto-flush if buffer is full
  if (ANALYTICS_BUFFER.length >= MAX_BUFFER_SIZE) {
    flushAnalytics().catch((error) => {
      console.error('Failed to flush analytics buffer:', error);
    });
  }
}

/**
 * Flush analytics buffer to file (async, delayed)
 */
async function flushAnalytics(): Promise<void> {
  if (ANALYTICS_BUFFER.length === 0) {
    return;
  }

  // Copy events to flush before removing from buffer
  const eventsToFlush = [...ANALYTICS_BUFFER];
  ANALYTICS_BUFFER.length = 0; // Clear buffer

  try {
    // Read existing analytics
    let analytics: any = {
      lastUpdate: null,
      events: [],
      metrics: {},
      summary: {},
    };

    try {
      const data = await fs.readFile(ANALYTICS_FILE, 'utf-8');
      analytics = JSON.parse(data);
    } catch {
      // File doesn't exist, use defaults
    }

    // Add new events
    analytics.events = [...analytics.events, ...eventsToFlush].slice(-1000); // Keep last 1000 events

    // Update metrics
    for (const event of eventsToFlush) {
      const key = `${event.engine}.${event.action}`;
      if (!analytics.metrics[key]) {
        analytics.metrics[key] = { count: 0, lastRun: null };
      }
      analytics.metrics[key].count++;
      analytics.metrics[key].lastRun = event.timestamp;
    }

    // Update summary
    analytics.summary = {
      totalEvents: analytics.events.length,
      engines: Array.from(new Set(analytics.events.map((e: AnalyticsEvent) => e.engine))),
      lastUpdate: new Date().toISOString(),
    };

    analytics.lastUpdate = new Date().toISOString();

    // Write to file
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
  } catch (error) {
    console.error('Failed to flush analytics:', error);
    // Put events back to buffer for retry
    ANALYTICS_BUFFER.unshift(...eventsToFlush);
  }
}

/**
 * Initialize analytics writer (call from runner)
 */
export function initializeAnalyticsWriter(): void {
  // Flush buffer periodically
  setInterval(async () => {
    await flushAnalytics();
  }, FLUSH_INTERVAL);

  // Flush on shutdown
  process.on('SIGINT', async () => {
    await flushAnalytics();
  });

  process.on('SIGTERM', async () => {
    await flushAnalytics();
  });

  console.log('✅ Analytics writer initialized');
}

