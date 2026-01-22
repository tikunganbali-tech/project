/**
 * E1.3 — ENGINE QUEUE MANAGER
 * 
 * File-based queue system untuk engine tasks
 * Admin UI menulis ke queue, Engine membaca dan execute
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const QUEUE_FILE = path.join(process.cwd(), 'engine', 'storage', 'queue.json');

export interface QueueItem {
  id: string;
  engineName: string;
  taskType: string;
  params?: any;
  priority?: number;
  createdAt: string;
  scheduledFor?: string;
}

/**
 * Add task to queue (called from API route)
 */
export async function addToQueue(item: Omit<QueueItem, 'id' | 'createdAt'>): Promise<void> {
  try {
    let queue: QueueItem[] = [];
    
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf-8');
      queue = JSON.parse(data);
    } catch {
      // File doesn't exist, start empty
    }

    const queueItem: QueueItem = {
      ...item,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    queue.push(queueItem);
    
    // Sort by priority (higher first) then by createdAt
    queue.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (error) {
    console.error('Failed to add to queue:', error);
    throw error;
  }
}

/**
 * Get queue status (for admin UI)
 */
export async function getQueueStatus(): Promise<{
  total: number;
  pending: number;
  items: QueueItem[];
}> {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    const queue: QueueItem[] = JSON.parse(data);
    
    return {
      total: queue.length,
      pending: queue.length,
      items: queue.slice(0, 20), // Return first 20 items
    };
  } catch {
    return {
      total: 0,
      pending: 0,
      items: [],
    };
  }
}

/**
 * Clear queue (for admin)
 */
export async function clearQueue(): Promise<void> {
  try {
    await fs.writeFile(QUEUE_FILE, JSON.stringify([], null, 2));
  } catch (error) {
    console.error('Failed to clear queue:', error);
    throw error;
  }
}

