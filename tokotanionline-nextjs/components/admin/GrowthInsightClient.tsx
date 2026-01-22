/**
 * PHASE 8C.6: Growth Insight Client Component (READ-ONLY)
 * 
 * Tampilkan: tren lintas channel, indeks performa, ringkasan opportunity/risk
 * ❌ Tidak ada tombol edit / publish / trigger
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  BarChart3,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface GrowthInsight {
  brandId: string;
  localeId: string;
  pageType: string;
  pageId?: string;
  generatedAt: string;
  signalIndices: Array<{
    channel: string;
    seoIndex: number;
    adsIndex: number;
    analyticsIndex: number;
    combinedIndex: number;
    trend: string;
  }>;
  intentConsistency: {
    score: number;
    consistency: string;
    issues: string[];
  };
  funnelGaps: Array<{
    stage: string;
    gapType: string;
    severity: string;
    description: string;
    impact: number;
  }>;
  growthStatus: {
    status: string;
    velocity: number;
    trend: string;
    momentum: number;
    indicators: Array<{
      type: string;
      direction: string;
      strength: number;
      description: string;
    }>;
  };
  category?: {
    category: string;
    confidence: number;
    reason: string;
    indicators: string[];
  };
}

interface GrowthInsightData {
  insights: GrowthInsight[];
  categories: Array<{
    category: string;
    brandId: string;
    localeId: string;
    pageType: string;
    confidence: number;
    reason: string;
    indicators: string[];
  }>;
  readOnly: boolean;
  warning: string;
}

export default function GrowthInsightClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<GrowthInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedLocale, setSelectedLocale] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedBrand, selectedLocale, selectedChannel]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedBrand) params.set('brandId', selectedBrand);
      if (selectedLocale) params.set('localeId', selectedLocale);
      if (selectedChannel) params.set('channel', selectedChannel);
      params.set('timeframe', '30');

      const response = await fetch(`/api/admin/growth-insight?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load growth insights');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load growth insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { insights, categories, readOnly, warning } = data;

  // Calculate summary from categories
  const opportunityCount = categories.filter(c => c.category === 'OPPORTUNITY').length;
  const riskCount = categories.filter(c => c.category === 'RISK').length;
  const stableCount = categories.filter(c => c.category === 'STABLE').length;

  return (
    <div className="space-y-6">
      {/* PHASE 8C.6: Read-only warning */}
      {readOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Read-Only Dashboard</span>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">{warning}</p>
        </div>
      )}

      {/* Summary Cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Insight Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Opportunities</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{opportunityCount}</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <XCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Risks</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{riskCount}</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Minus className="w-5 h-5" />
              <span className="text-sm font-medium">Stable</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{stableCount}</div>
          </div>
        </div>
      </section>

      {/* Growth Insights */}
      {insights.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No growth insights available</p>
          <p className="text-sm mt-2">Growth insights will appear here when cross-channel data is analyzed.</p>
        </div>
      ) : (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Growth Insights</h2>
          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Growth Insight</h3>
                    <p className="text-sm text-gray-500">
                      {insight.pageId ? `Page: ${insight.pageId}` : `${insight.pageType} (Brand/Locale Level)`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Generated: {new Date(insight.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {insight.growthStatus.status === 'ACCELERATING' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {insight.growthStatus.status}
                      </span>
                    )}
                    {insight.growthStatus.status === 'STAGNATING' || insight.growthStatus.status === 'DECLINING' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        {insight.growthStatus.status}
                      </span>
                    )}
                    {insight.growthStatus.status === 'STABLE' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        {insight.growthStatus.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Signal Indices */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Channel Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {insight.signalIndices.map((idx, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded">
                        <div className="text-xs font-medium text-gray-600 mb-1">{idx.channel}</div>
                        <div className="text-lg font-bold text-gray-800">
                          {(idx.combinedIndex * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          SEO: {(idx.seoIndex * 100).toFixed(0)}% | 
                          Ads: {(idx.adsIndex * 100).toFixed(0)}% | 
                          Analytics: {(idx.analyticsIndex * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Intent Consistency */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Intent Consistency</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Score: {(insight.intentConsistency.score * 100).toFixed(0)}%</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        insight.intentConsistency.consistency === 'HIGH' ? 'bg-green-100 text-green-800' :
                        insight.intentConsistency.consistency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {insight.intentConsistency.consistency}
                      </span>
                    </div>
                    {insight.intentConsistency.issues.length > 0 && (
                      <div className="text-xs text-red-600">
                        <strong>Issues:</strong> {insight.intentConsistency.issues.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Funnel Gaps */}
                {insight.funnelGaps.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Funnel Gaps</h4>
                    <div className="space-y-2">
                      {insight.funnelGaps.map((gap, i) => (
                        <div key={i} className={`p-3 rounded border-l-4 ${
                          gap.severity === 'HIGH' ? 'bg-red-50 border-red-400' :
                          gap.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-400' :
                          'bg-gray-50 border-gray-400'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-800">{gap.stage} Funnel</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              gap.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                              gap.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {gap.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{gap.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category */}
                {insight.category && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
                    <div className={`p-3 rounded ${
                      insight.category.category === 'OPPORTUNITY' ? 'bg-green-50' :
                      insight.category.category === 'RISK' ? 'bg-red-50' :
                      'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {insight.category.category === 'OPPORTUNITY' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {insight.category.category === 'RISK' && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        {insight.category.category === 'STABLE' && (
                          <Minus className="w-4 h-4 text-gray-600" />
                        )}
                        <span className="font-medium text-gray-800">{insight.category.category}</span>
                        <span className="text-xs text-gray-500">
                          (Confidence: {(insight.category.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.category.reason}</p>
                      {insight.category.indicators.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <strong>Indicators:</strong> {insight.category.indicators.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
