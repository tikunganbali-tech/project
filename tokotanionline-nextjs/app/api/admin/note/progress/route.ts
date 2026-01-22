/**
 * NOTE LAYER API - READ-ONLY
 * Read engine progress from NOTE layer
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const NOTE_PATH = join(process.cwd(), '..', 'note');

// GET - Read progress for all engines or specific engine
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('engine');

    const progressDir = join(NOTE_PATH, 'progress');

    if (!existsSync(progressDir)) {
      return NextResponse.json({});
    }

    if (engineName) {
      // Single engine
      const progressPath = join(progressDir, `${engineName}.json`);
      if (!existsSync(progressPath)) {
        return NextResponse.json(null);
      }

      const progressData = readFileSync(progressPath, 'utf-8');
      return NextResponse.json(JSON.parse(progressData));
    } else {
      // All engines
      const files = readdirSync(progressDir).filter(f => f.endsWith('.json'));
      const progress: Record<string, any> = {};

      for (const file of files) {
        const engine = file.replace('.json', '');
        const progressPath = join(progressDir, file);
        const progressData = readFileSync(progressPath, 'utf-8');
        progress[engine] = JSON.parse(progressData);
      }

      return NextResponse.json(progress);
    }
  } catch (error: any) {
    console.error('Error reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to read progress', details: error.message },
      { status: 500 }
    );
  }
}


