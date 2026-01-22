/**
 * E1.3 — ENGINE HEALTH CHECK API (READ-ONLY)
 * 
 * Read-only endpoint untuk membaca engine health dari file storage
 * TIDAK BISA trigger engine execution
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const HEALTH_FILE = path.join(process.cwd(), 'engine', 'storage', 'health.json');

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export async function GET() {
  try {
    const data = await fs.readFile(HEALTH_FILE, 'utf-8');
    const health = JSON.parse(data);
    
    return NextResponse.json({
      engine: health.engine || 'idle',
      lastRun: health.lastRun || null,
      lastSuccess: health.lastSuccess || null,
      status: health.status || 'ok',
      uptime: health.uptime ? Date.now() - health.uptime : 0,
      version: health.version || '1.0.0',
    });
  } catch (error: any) {
    // Engine not running or file doesn't exist
    return NextResponse.json({
      engine: 'offline',
      lastRun: null,
      lastSuccess: null,
      status: 'offline',
      uptime: 0,
      version: '1.0.0',
    });
  }
}

