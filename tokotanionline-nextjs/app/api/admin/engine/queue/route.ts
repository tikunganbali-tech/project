/**
 * E1.3 — ENGINE QUEUE API
 * 
 * GET: Read queue status (non-blocking)
 * POST: Add task to queue (write to file, engine picks up later)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as path from 'path';

// Use queue manager from engine directory
const QUEUE_FILE = path.join(process.cwd(), 'engine', 'storage', 'queue.json');

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Revalidate every 30 seconds

/**
 * GET: Read queue status (read-only, non-blocking)
 */
export async function GET() {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    const queue = JSON.parse(data);
    
    return NextResponse.json({
      total: queue.length,
      pending: queue.length,
      items: queue.slice(0, 20),
    });
  } catch {
    return NextResponse.json({
      total: 0,
      pending: 0,
      items: [],
    });
  }
}

/**
 * POST: Add task to queue (write to file)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { engineName, taskType, params, priority } = body;

    if (!engineName || !taskType) {
      return NextResponse.json(
        { error: 'Missing engineName or taskType' },
        { status: 400 }
      );
    }

    const fs = await import('fs/promises');
    
    // Read existing queue
    let queue: any[] = [];
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf-8');
      queue = JSON.parse(data);
    } catch {
      // File doesn't exist, start empty
    }

    // Add new item
    const queueItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      engineName,
      taskType,
      params: params || {},
      priority: priority || 0,
      createdAt: new Date().toISOString(),
    };

    queue.push(queueItem);
    
    // Sort by priority
    queue.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Write queue
    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));

    return NextResponse.json({
      success: true,
      taskId: queueItem.id,
      message: 'Task added to queue',
    });
  } catch (error: any) {
    console.error('Failed to add task to queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add task to queue' },
      { status: 500 }
    );
  }
}

