/**
 * STEP 23C-2 — ATTRIBUTION SUMMARY (WHY)
 * 
 * Menjelaskan KENAPA campaign berkontribusi
 * - Bahasa manusia, non-teknis
 * - Berdasarkan score & explanation dari engine
 * - Skeleton loading per section
 */

'use client';

import { BadgeCheck, AlertCircle, Loader2 } from 'lucide-react';

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

interface AttributionResult {
  campaignId: string;
  score: number;
  explanation: string;
  timeline: Array<{
    eventKey: string;
    timestamp: string;
    entityId: string;
  }>;
}

interface AttributionSummaryProps {
  campaign: Campaign;
  attribution: AttributionResult | undefined;
  loading: boolean;
  error: string | null;
}

function formatContributionText(score: number, timelineLength: number): string {
  const percent = Math.round(score * 100);
  
  if (timelineLength === 0) {
    return `Campaign ini belum terlibat dalam perjalanan pelanggan selama 7 hari terakhir.`;
  }

  if (timelineLength === 1) {
    return `Campaign ini berkontribusi ${percent}% terhadap konversi karena merupakan satu-satunya campaign yang terlibat sebelum pembelian.`;
  }

  return `Campaign ini berkontribusi ${percent}% terhadap konversi karena terlibat di ${timelineLength} dari ${timelineLength} interaksi pelanggan sebelum pembelian.`;
}

function SummarySkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-gray-200 rounded"></div>
      <div className="h-16 bg-gray-100 rounded-lg"></div>
      <div className="h-4 w-full bg-gray-200 rounded"></div>
      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
    </div>
  );
}

export default function AttributionSummary({
  campaign,
  attribution,
  loading,
  error,
}: AttributionSummaryProps) {
  if (loading) {
    return <SummarySkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">Data Atribusi Tidak Tersedia</h3>
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!attribution) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <BadgeCheck className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Belum Ada Data Atribusi</h3>
            <p className="text-sm text-gray-600">
              Campaign ini belum memiliki data atribusi untuk periode 7 hari terakhir. 
              Data akan muncul otomatis ketika campaign terlibat dalam perjalanan pelanggan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const percent = Math.round(attribution.score * 100);
  const timelineLength = attribution.timeline?.length || 0;
  const contributionText = attribution.explanation 
    ? attribution.explanation 
    : formatContributionText(attribution.score, timelineLength);

  return (
    <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50 shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-indigo-100">
          <BadgeCheck className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              Kontribusi Campaign
            </h3>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-indigo-200">
              <span className="text-2xl font-bold text-indigo-700">{percent}%</span>
              <span className="text-sm text-indigo-600">kontribusi terhadap konversi</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-indigo-100 p-4">
            <p className="text-sm text-gray-800 leading-relaxed">
              {contributionText}
            </p>
          </div>

          {attribution.timeline && attribution.timeline.length > 0 && (
            <div className="text-xs text-indigo-700">
              <span className="font-medium">Jumlah interaksi:</span> {timelineLength} touchpoint
              {timelineLength > 1 ? 's' : ''} dalam perjalanan pelanggan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
