/**
 * SEO TITAN MODE - Admin Dashboard
 * Monitor all SEO engines
 */

import SeoTitanClient from '@/components/admin/SeoTitanClient';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function SeoTitanPage() {
  // 🔒 SECURITY: Use consistent guard pattern
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requireRole: 'super_admin',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get all engine statuses
  const engineStatuses: Prisma.SeoEngineStatusGetPayload<{}>[] = await prisma.seoEngineStatus.findMany({
    orderBy: { engineName: 'asc' },
  }).catch(() => []);

  // Get recent logs
  const recentLogs = await prisma.seoEngineLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  }).catch(() => []);

  // Get scheduled tasks
  const scheduledTasks = await prisma.seoScheduledTask.findMany({
    where: { isActive: true },
    orderBy: { engineName: 'asc' },
  }).catch(() => []);

  // Get crawl issues
  const crawlIssues = await prisma.seoCrawlIssue.findMany({
    where: { status: 'open' },
    orderBy: { severity: 'desc' },
    take: 20,
  }).catch(() => []);

  // Calculate statistics
  const stats = {
    totalEngines: engineStatuses.length,
    healthy: engineStatuses.filter((e) => e.healthScore >= 80).length,
    warning: engineStatuses.filter((e) => e.healthScore >= 50 && e.healthScore < 80).length,
    critical: engineStatuses.filter((e) => e.healthScore < 50).length,
    totalLogs: await prisma.seoEngineLog.count().catch(() => 0),
    openIssues: crawlIssues.length,
    activeTasks: scheduledTasks.length,
  };

  return (
    <SeoTitanClient
      engineStatuses={JSON.parse(JSON.stringify(engineStatuses))}
      recentLogs={JSON.parse(JSON.stringify(recentLogs))}
      scheduledTasks={JSON.parse(JSON.stringify(scheduledTasks))}
      crawlIssues={JSON.parse(JSON.stringify(crawlIssues))}
      stats={stats}
    />
  );
}






