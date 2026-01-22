'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import CampaignCard, { CampaignSummary } from './CampaignCard';

interface CampaignApiResponse {
  campaigns: CampaignSummary[];
  meta?: {
    rule?: string;
    windowDays?: number;
  };
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-gray-200 rounded"></div>
        <div className="h-5 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 w-56 bg-gray-200 rounded"></div>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 min-w-[140px] h-16 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
      <div className="h-12 bg-gray-100 rounded-lg"></div>
    </div>
  );
}

export default function CampaignListClient() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ rule?: string; windowDays?: number }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/marketing/campaigns', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Gagal memuat data');
        }

        const data: CampaignApiResponse = await response.json();
        setCampaigns(data.campaigns || []);
        setMeta(data.meta || {});
      } catch (err: any) {
        console.error('Error fetching campaigns', err);
        setError('Tidak dapat memuat data kampanye dari engine');
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Kinerja Campaign</h1>
        <p className="text-sm text-gray-600">
          Ringkasan eksekutif untuk pemilik bisnis: campaign mana yang mendorong hasil dan seberapa besar kontribusinya.
        </p>
        <p className="text-xs text-gray-500">
          Sumber: MarketingCampaign, CampaignPerformance (engine), Attribution (rule LINEAR, window 7 hari). Frontend hanya baca.
        </p>
      </div>

      {meta?.rule && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Loader2 className="h-3.5 w-3.5 text-slate-500" />
          Attribution: {meta.rule} • Window {meta.windowDays || 7} hari • Read-only
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-medium">Data belum bisa dimuat</p>
            <p className="text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && !hasCampaigns && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada campaign yang memiliki data performa</h3>
          <p className="text-sm text-gray-600">
            Engine belum mengirimkan performa teragregasi untuk campaign. Data akan muncul otomatis ketika tersedia.
          </p>
        </div>
      )}

      {!loading && hasCampaigns && (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

