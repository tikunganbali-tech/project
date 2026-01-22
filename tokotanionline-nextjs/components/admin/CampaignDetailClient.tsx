/**
 * STEP 23C-2 — CAMPAIGN DETAIL CLIENT
 * 
 * Executive view untuk memahami KENAPA campaign bekerja
 * - Attribution explanation (WHY)
 * - User journey timeline (HOW)
 * - Rule transparency
 * - Non-technical language
 * - Read-only (no edit, no execute)
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2, Facebook, Globe, Music, PlayCircle, PauseCircle, Rocket } from 'lucide-react';
import Link from 'next/link';
import AttributionSummary from './AttributionSummary';
import AttributionTimeline from './AttributionTimeline';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string | null;
  metrics: {
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

interface AttributionData {
  query: {
    rule: string;
    windowDays: number;
  };
  results: Array<{
    campaignId: string;
    score: number;
    explanation: string;
    timeline: Array<{
      eventKey: string;
      timestamp: string;
      entityId: string;
    }>;
  }>;
}

interface CampaignDetailClientProps {
  campaign: Campaign;
}

function platformIcon(platform: string) {
  switch (platform) {
    case 'FACEBOOK':
      return Facebook;
    case 'GOOGLE':
      return Globe;
    case 'TIKTOK':
      return Music;
    default:
      return Rocket;
  }
}

function platformLabel(platform: string) {
  switch (platform) {
    case 'FACEBOOK':
      return 'Facebook';
    case 'GOOGLE':
      return 'Google';
    case 'TIKTOK':
      return 'TikTok';
    default:
      return platform || 'Unknown';
  }
}

function statusBadge(status: string) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700">
        <PlayCircle className="h-4 w-4" />
        Aktif
      </span>
    );
  }
  if (normalized === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-amber-50 text-amber-700">
        <PauseCircle className="h-4 w-4" />
        Dijeda
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
      <Rocket className="h-4 w-4" />
      {status || 'Draft'}
    </span>
  );
}

export default function CampaignDetailClient({ campaign }: CampaignDetailClientProps) {
  const [attribution, setAttribution] = useState<AttributionData | null>(null);
  const [loadingAttribution, setLoadingAttribution] = useState(true);
  const [attributionError, setAttributionError] = useState<string | null>(null);

  useEffect(() => {
    const loadAttribution = async () => {
      try {
        setLoadingAttribution(true);
        setAttributionError(null);

        const params = new URLSearchParams({
          campaignId: campaign.id,
          rule: 'LINEAR',
          windowDays: '7',
        });

        const response = await fetch(`/api/admin/marketing/attribution?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Gagal memuat data atribusi');
        }

        const data: AttributionData = await response.json();
        setAttribution(data);
      } catch (err: any) {
        console.error('Error fetching attribution:', err);
        setAttributionError('Data atribusi sedang tidak tersedia. Silakan coba lagi.');
        setAttribution(null);
      } finally {
        setLoadingAttribution(false);
      }
    };

    loadAttribution();
  }, [campaign.id]);

  const PlatformIcon = platformIcon(campaign.platform);
  const attributionResult = attribution?.results?.find((r) => r.campaignId === campaign.id);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/marketing/campaigns"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Campaign
      </Link>

      {/* Campaign Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50">
                <PlatformIcon className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                <p className="text-sm text-gray-500">
                  {platformLabel(campaign.platform)}
                  {campaign.objective ? ` • ${campaign.objective}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge(campaign.status)}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Periode analisis:</span> 7 hari terakhir
          </p>
        </div>
      </div>

      {/* Attribution Summary (WHY) */}
      <AttributionSummary
        campaign={campaign}
        attribution={attributionResult}
        loading={loadingAttribution}
        error={attributionError}
      />

      {/* Attribution Timeline (HOW) */}
      <AttributionTimeline
        timeline={attributionResult?.timeline || []}
        loading={loadingAttribution}
        error={attributionError}
      />

      {/* Rule Explanation */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Metode Atribusi</h3>
        <p className="text-sm text-slate-700 mb-2">
          <span className="font-medium">Linear</span>
        </p>
        <p className="text-sm text-slate-600">
          Setiap campaign yang terlibat dalam perjalanan pelanggan mendapat porsi kontribusi yang sama. 
          Jika ada 3 campaign yang terlibat sebelum pembelian, masing-masing mendapat 33% kontribusi.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Window analisis: 7 hari • Data dari engine (read-only)
        </p>
      </div>
    </div>
  );
}
