import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import CampaignDetailClient from '@/components/admin/CampaignDetailClient';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session || !['admin', 'super_admin'].includes((session.user as any).role)) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // Fetch campaign from DB
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    redirect('/admin/marketing/campaigns');
  }

  // Get 7-day performance summary
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);

  const performance = await prisma.campaignPerformance.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: id,
      date: { gte: windowStart },
    },
    _sum: {
      clicks: true,
      conversions: true,
      revenue: true,
    },
  });

  const perf = performance[0]?._sum || {
    clicks: 0,
    conversions: 0,
    revenue: 0,
  };

  return (
    <CampaignDetailClient
      campaign={{
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        objective: campaign.objective,
        metrics: {
          clicks: perf.clicks || 0,
          conversions: perf.conversions || 0,
          revenue: perf.revenue || 0,
        },
      }}
    />
  );
}
