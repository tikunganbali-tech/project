'use client';

import Link from 'next/link';
import { BadgeCheck, PauseCircle, PlayCircle, Rocket, Sparkles, ArrowRight } from 'lucide-react';

type Platform = 'FACEBOOK' | 'GOOGLE' | 'TIKTOK' | string;

export interface CampaignSummary {
  id: string;
  name: string;
  platform: Platform;
  status: string;
  objective?: string | null;
  metrics: {
    clicks: number;
    conversions: number;
    revenue: number;
  };
  attribution?: {
    score: number | null;
    percent: number | null;
    explanation?: string | null;
    rule: string;
    windowDays: number;
    primaryText?: string | null;
  } | null;
}

interface CampaignCardProps {
  campaign: CampaignSummary;
}

function platformLabel(platform: Platform) {
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
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        <PlayCircle className="h-4 w-4" />
        Aktif
      </span>
    );
  }

  if (normalized === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
        <PauseCircle className="h-4 w-4" />
        Dijeda
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <Rocket className="h-4 w-4" />
      {status || 'Draft'}
    </span>
  );
}

function metricTile(label: string, value: string, description?: string) {
  return (
    <div className="flex-1 min-w-[140px] rounded-lg border border-gray-200 bg-white/60 px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {description && <p className="text-[11px] text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const attributionText =
    campaign.attribution?.primaryText ||
    (campaign.attribution?.percent != null
      ? `${campaign.attribution.percent}% kontribusi terhadap konversi`
      : 'Belum ada data atribusi');

  const attributionMeta =
    campaign.attribution?.rule && campaign.attribution?.windowDays
      ? `Rule: ${campaign.attribution.rule} • Window: ${campaign.attribution.windowDays} hari`
      : 'Atribusi by engine';

  return (
    <Link
      href={`/admin/marketing/campaigns/${campaign.id}`}
      className="block rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
            {statusBadge(campaign.status)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {platformLabel(campaign.platform)}
            {campaign.objective ? ` • Fokus: ${campaign.objective}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Sparkles className="h-3.5 w-3.5" />
            Executive Summary
          </span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {metricTile('Clicks (7 hari)', campaign.metrics.clicks.toLocaleString())}
        {metricTile('Conversions (7 hari)', campaign.metrics.conversions.toLocaleString())}
        {metricTile(
          'Revenue (7 hari)',
          campaign.metrics.revenue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }),
          'Angka dari engine, sudah bersih'
        )}
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <BadgeCheck className="h-5 w-5 text-indigo-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900">{attributionText}</p>
            <p className="text-xs text-indigo-700 mt-1">
              {attributionMeta}
              {campaign.attribution?.explanation ? ` — ${campaign.attribution.explanation}` : ''}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

