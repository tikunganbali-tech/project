/**
 * Activity Logger
 * Helper untuk mencatat aktivitas admin ke ActivityLog table
 */

import { prisma } from './db';

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'DELETE'
  | 'LOGIN'
  | 'RESET_PASSWORD'
  | 'APPROVE'
  | 'REJECT'
  | 'SCHEDULE'
  | 'ARCHIVE';

export type ActivityEntityType = 'PRODUCT' | 'POST' | 'USER' | 'SYSTEM' | 'CATEGORY';

/**
 * Log activity to ActivityLog table
 * Non-blocking: errors are silently caught
 */
export async function logActivity(options: {
  actorId: string | null;
  action: ActivityAction;
  entityType?: ActivityEntityType;
  entityId?: string;
  metadata?: any;
}): Promise<void> {
  try {
    // Run async, don't block
    setImmediate(async () => {
      try {
        await prisma.activityLog.create({
          data: {
            actorId: options.actorId,
            action: options.action,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            metadata: options.metadata || null,
          },
        });
      } catch (error) {
        // Silent fail - don't break main flow
        console.error('Error logging activity:', error);
      }
    });
  } catch (error) {
    // Silent fail
    console.error('Error in logActivity:', error);
  }
}
