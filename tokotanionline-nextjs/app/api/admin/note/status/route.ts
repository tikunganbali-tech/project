/**
 * NOTE LAYER API - READ-ONLY
 * 
 * UI hanya membaca dari NOTE layer
 * Tidak ada trigger engine
 * Tidak ada write ke database
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const NOTE_PATH = join(process.cwd(), '..', 'note');

// GET - Read status.json
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusPath = join(NOTE_PATH, 'status.json');
    
    if (!existsSync(statusPath)) {
      return NextResponse.json({
        lock: false,
        running_engine: null,
        last_engine: null,
        last_update: null,
      });
    }

    const statusData = readFileSync(statusPath, 'utf-8');
    const status = JSON.parse(statusData);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error reading status:', error);
    return NextResponse.json(
      { error: 'Failed to read status', details: error.message },
      { status: 500 }
    );
  }
}


