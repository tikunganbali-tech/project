/**
 * FASE 3.1: Engine Center — Insight & Decision Support
 * 
 * Read-only insight untuk memahami kondisi engine tanpa menjalankan apa pun.
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
import EngineInsightClient from '@/components/admin/engine/insight/EngineInsightClient';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EngineInsightPage() {
  // Auth & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'system.view')) {
    redirect('/admin');
  }

  // FASE 3.1: Fetch data (7 days, query ringan)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Engine Health Summary - ContentJob data
  let healthData = {
    totalJobs: 0,
    successJobs: 0,
    failedJobs: 0,
    avgDuration: null as number | null,
  };

  try {
    const jobs = await prisma.contentJob.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    healthData.totalJobs = jobs.length;
    healthData.successJobs = jobs.filter((j) => j.status === 'DONE').length;
    healthData.failedJobs = jobs.filter((j) => j.status === 'FAILED').length;

    // Calculate average duration (only for completed jobs)
    const completedJobs = jobs.filter(
      (j) => j.status === 'DONE' && j.startedAt && j.finishedAt
    );
    if (completedJobs.length > 0) {
      const totalDuration = completedJobs.reduce((sum, job) => {
        if (job.startedAt && job.finishedAt) {
          return sum + (job.finishedAt.getTime() - job.startedAt.getTime());
        }
        return sum;
      }, 0);
      healthData.avgDuration = Math.round(totalDuration / completedJobs.length / 1000); // seconds
    }
  } catch (error) {
    console.error('Error fetching health data:', error);
    // Continue with empty data
  }

  // 2. Failure Pattern - Top 3 errors
  let failurePattern: Array<{ error: string; count: number }> = [];

  try {
    // Get failed jobs
    const failedJobs = await prisma.contentJob.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        contentResult: {
          select: {
            summary: true,
          },
        },
      },
    });

    // Normalize errors from ContentResult summary or status
    const errorMap = new Map<string, number>();
    failedJobs.forEach((job) => {
      let errorText = 'Unknown error';
      if (job.contentResult?.summary) {
        // Extract error message from summary
        const summary = job.contentResult.summary;
        // Normalize: take first line or first 50 chars
        errorText = summary.split('\n')[0].substring(0, 50).trim() || 'Job failed';
      } else {
        errorText = 'Job failed (no details)';
      }
      errorMap.set(errorText, (errorMap.get(errorText) || 0) + 1);
    });

    // Get top 3
    failurePattern = Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  } catch (error) {
    console.error('Error fetching failure pattern:', error);
    // Continue with empty data
  }

  // 3. Activity Trend - Job count per day (7 days)
  let activityTrend: Array<{ day: string; count: number }> = [];

  try {
    const jobs = await prisma.contentJob.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const dayMap = new Map<string, number>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = dayNames[date.getDay()];
      dayMap.set(dayKey, 0);
    }

    // Count jobs per day
    jobs.forEach((job) => {
      const dayKey = dayNames[job.createdAt.getDay()];
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    });

    // Convert to array (last 7 days order)
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = dayNames[date.getDay()];
      activityTrend.push({
        day: dayKey,
        count: dayMap.get(dayKey) || 0,
      });
    }
  } catch (error) {
    console.error('Error fetching activity trend:', error);
    // Continue with empty data
  }

  // 4. Configuration Awareness
  let lastConfigChange: { setting: string; changedBy: string; timestamp: string } | null = null;

  try {
    const configChange = await prisma.eventLog.findFirst({
      where: {
        event: 'system_settings_change',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        meta: true,
        createdAt: true,
      },
    });

    if (configChange && configChange.meta) {
      const meta = configChange.meta as any;
      lastConfigChange = {
        setting: meta.setting || 'Unknown',
        changedBy: meta.changedBy || 'System',
        timestamp: configChange.createdAt.toISOString(),
      };
    }
  } catch (error) {
    console.error('Error fetching config change:', error);
    // Continue with null
  }

  return (
    <EngineInsightClient
      healthData={healthData}
      failurePattern={failurePattern}
      activityTrend={activityTrend}
      lastConfigChange={lastConfigChange}
    />
  );
}
