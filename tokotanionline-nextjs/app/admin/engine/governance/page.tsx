/**
 * FASE 3.2: Engine Center — Visibility & Governance
 * 
 * Read-only governance untuk memahami lifecycle job, kepemilikan, retensi, dan hak akses.
 * 
 * Rules:
 * - Read-only (tidak ada aksi)
 * - Tanpa automation / cron / AI
 * - Tidak mengaktifkan engine
 * - Query ringan, audit-grade
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import EngineGovernanceClient from '@/components/admin/engine/governance/EngineGovernanceClient';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EngineGovernancePage() {
  // Auth & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'system.view')) {
    redirect('/admin');
  }

  // FASE 3.2: Fetch data (7 days, query ringan)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Job Lifecycle Overview - Group by status
  let lifecycleData = {
    submitted: 0, // PENDING
    running: 0, // RUNNING
    completed: 0, // DONE
    failed: 0, // FAILED
  };

  try {
    const jobs = await prisma.contentJob.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        status: true,
      },
    });

    jobs.forEach((job) => {
      if (job.status === 'PENDING') lifecycleData.submitted++;
      else if (job.status === 'RUNNING') lifecycleData.running++;
      else if (job.status === 'DONE') lifecycleData.completed++;
      else if (job.status === 'FAILED') lifecycleData.failed++;
    });
  } catch (error) {
    console.error('Error fetching lifecycle data:', error);
    // Continue with empty data
  }

  // 2. Ownership & Traceability - 10 latest items
  let traceabilityItems: Array<{
    jobId: string;
    triggerSource: string;
    actor: string;
    timestamp: string;
  }> = [];

  try {
    const jobs = await prisma.contentJob.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        requestedBy: true,
        createdAt: true,
        params: true,
      },
    });

    traceabilityItems = jobs.map((job) => {
      // Determine trigger source from params or default to 'manual'
      let triggerSource = 'manual';
      if (job.params && typeof job.params === 'object') {
        const params = job.params as any;
        if (params.source === 'api' || params.trigger === 'api') {
          triggerSource = 'API';
        } else {
          triggerSource = 'manual';
        }
      }

      // Determine actor
      const actor = job.requestedBy || 'system';

      return {
        jobId: job.id.substring(0, 8), // Short ID
        triggerSource,
        actor,
        timestamp: job.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error('Error fetching traceability data:', error);
    // Continue with empty data
  }

  // 3. Retention Awareness
  let retentionData = {
    policyDays: null as number | null,
    oldestJobDate: null as string | null,
    estimatedCleanupDate: null as string | null,
  };

  try {
    // Get oldest job
    const oldestJob = await prisma.contentJob.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        createdAt: true,
      },
    });

    if (oldestJob) {
      retentionData.oldestJobDate = oldestJob.createdAt.toISOString();

      // FASE 3.2: Retention policy from config (default: 90 days if not configured)
      // In production, this would come from a config file or database
      retentionData.policyDays = 90; // Default retention policy

      // Calculate estimated cleanup date
      if (retentionData.policyDays) {
        const cleanupDate = new Date(oldestJob.createdAt);
        cleanupDate.setDate(cleanupDate.getDate() + retentionData.policyDays);
        retentionData.estimatedCleanupDate = cleanupDate.toISOString();
      }
    }
  } catch (error) {
    console.error('Error fetching retention data:', error);
    // Continue with null
  }

  // 4. Permission Clarity - Role/permission config
  // This is read from the permission system, not from database
  const permissionInfo = {
    admin: {
      access: 'full read',
      description: 'Can view all engine data and logs',
    },
    operator: {
      access: 'limited read',
      description: 'Can view engine status and recent activity',
    },
    viewer: {
      access: 'insight only',
      description: 'Can view engine insights and summaries only',
    },
  };

  return (
    <EngineGovernanceClient
      lifecycleData={lifecycleData}
      traceabilityItems={traceabilityItems}
      retentionData={retentionData}
      permissionInfo={permissionInfo}
      currentRole={userRole}
    />
  );
}
