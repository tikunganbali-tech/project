/**
 * E1.3 — ENGINE STATS API (READ-ONLY)
 * 
 * Read-only endpoint untuk membaca engine stats dari file storage
 * Non-blocking, menggunakan ISR
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const STATS_FILE = path.join(process.cwd(), 'engine', 'storage', 'stats.json');
const HEALTH_FILE = path.join(process.cwd(), 'engine', 'storage', 'health.json');

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  try {
    // Read stats file
    let stats: any = {
      totalEngines: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      totalLogs: 0,
    };

    try {
      const statsData = await fs.readFile(STATS_FILE, 'utf-8');
      stats = JSON.parse(statsData);
    } catch {
      // File doesn't exist, use defaults
    }

    // Read health for engine status
    let health: any = {};
    try {
      const healthData = await fs.readFile(HEALTH_FILE, 'utf-8');
      health = JSON.parse(healthData);
    } catch {
      // File doesn't exist
    }

    return NextResponse.json({
      ...stats,
      engineStatus: health.engine || 'idle',
      lastRun: health.lastRun || null,
      lastSuccess: health.lastSuccess || null,
    });
  } catch (error: any) {
    console.error('Failed to read engine stats:', error);
    return NextResponse.json({
      totalEngines: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      totalLogs: 0,
      engineStatus: 'offline',
      lastRun: null,
      lastSuccess: null,
    });
  }
}

