/**
 * E1.3 — ENGINE ANALYTICS API (READ-ONLY)
 * 
 * Read-only endpoint untuk membaca analytics dari file storage
 * Analytics ditulis oleh engine secara batch, async, delayed
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const ANALYTICS_FILE = path.join(process.cwd(), 'engine', 'storage', 'analytics.json');

export const dynamic = 'force-dynamic';
export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const data = await fs.readFile(ANALYTICS_FILE, 'utf-8');
    const analytics = JSON.parse(data);
    
    return NextResponse.json(analytics);
  } catch (error: any) {
    // Analytics file doesn't exist yet
    return NextResponse.json({
      lastUpdate: null,
      metrics: {},
      summary: {},
    });
  }
}

