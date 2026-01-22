/**
 * PHASE 7C: Cross-Brand & Cross-Locale Insights Dashboard (READ-ONLY)
 * 
 * Displays aggregated performance insights across brands and locales.
 * NO edit buttons, NO publish buttons, NO rewrite buttons.
 * Informational only.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface AggregatedInsight {
  totalPages: number;
  avgSeoScore: number;
  avgPosition: number;
  avgCtr: number;
  totalImpressions: number;
  avgDwellTime: number;
  avgBounceRate: number;
  avgScrollDepth: number;
  seoScoreTrend: string;
  positionTrend: string;
  ctrTrend: string;
  scoreDistribution: Record<string, number>;
  positionDistribution: Record<string, number>;
  generatedAt: string;
}

interface InsightsDashboardProps {
  currentBrandId?: string;
  currentLocaleId?: string;
}

export default function InsightsDashboard({ 
  currentBrandId, 
  currentLocaleId 
}: InsightsDashboardProps) {
  const { data: session } = useSession();
  const [scope, setScope] = useState<'brand' | 'locale' | 'brand_locale' | 'global'>('global');
  const [insight, setInsight] = useState<AggregatedInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [scope, currentBrandId, currentLocaleId]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ scope });
      if (scope === 'brand' || scope === 'brand_locale') {
        if (currentBrandId) {
          params.set('brandId', currentBrandId);
        }
      }
      if (scope === 'locale' || scope === 'brand_locale') {
        if (currentLocaleId) {
          params.set('localeId', currentLocaleId);
        }
      }

      const response = await fetch(`/api/admin/insights/aggregated?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load insights');
      }

      const data = await response.json();
      setInsight(data.insight);
    } catch (err: any) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="text-green-600" size={16} />;
      case 'falling':
        return <TrendingDown className="text-red-600" size={16} />;
      default:
        return <Minus className="text-gray-400" size={16} />;
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <div>
            <p className="font-medium text-red-900">Error loading insights</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-6">
        <p className="text-gray-600">No insights available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* PHASE 7C: Read-only warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-blue-900">Read-Only Insights</p>
            <p className="text-sm text-blue-700 mt-1">
              This dashboard shows aggregated performance data. No content access, no edit, no publish.
            </p>
          </div>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Scope:</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="global">Global (All Brands & Locales)</option>
          {currentBrandId && (
            <option value="brand">Current Brand</option>
          )}
          {currentLocaleId && (
            <option value="locale">Current Locale</option>
          )}
          {currentBrandId && currentLocaleId && (
            <option value="brand_locale">Current Brand + Locale</option>
          )}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pages</p>
              <p className="text-2xl font-bold mt-1">{insight.totalPages}</p>
            </div>
            <BarChart3 className="text-gray-400" size={24} />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg SEO Score</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{insight.avgSeoScore.toFixed(1)}</p>
                {getTrendIcon(insight.seoScoreTrend)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Position</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{insight.avgPosition.toFixed(1)}</p>
                {getTrendIcon(insight.positionTrend)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg CTR</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{formatPercentage(insight.avgCtr)}</p>
                {getTrendIcon(insight.ctrTrend)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Engagement Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Avg Dwell Time</p>
            <p className="text-xl font-semibold mt-1">{insight.avgDwellTime.toFixed(0)}s</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Bounce Rate</p>
            <p className="text-xl font-semibold mt-1">{formatPercentage(insight.avgBounceRate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Scroll Depth</p>
            <p className="text-xl font-semibold mt-1">{formatPercentage(insight.avgScrollDepth)}</p>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">SEO Score Distribution</h3>
        <div className="space-y-2">
          {Object.entries(insight.scoreDistribution).map(([range, count]) => (
            <div key={range} className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">{range}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                <div
                  className="bg-blue-600 h-4 rounded-full"
                  style={{ width: `${(count / insight.totalPages) * 100}%` }}
                />
              </div>
              <div className="w-12 text-sm text-gray-700 text-right">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Position Distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">SERP Position Distribution</h3>
        <div className="space-y-2">
          {Object.entries(insight.positionDistribution).map(([range, count]) => (
            <div key={range} className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">{range}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{ width: `${(count / insight.totalPages) * 100}%` }}
                />
              </div>
              <div className="w-12 text-sm text-gray-700 text-right">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated At */}
      <div className="text-sm text-gray-500 text-center">
        Generated at: {new Date(insight.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
