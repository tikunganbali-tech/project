/**
 * PHASE 9A: Partner Portal Client Component (READ-ONLY)
 * 
 * Client-side component for Partner Portal
 * Displays read-only insights, analytics, and SEO summaries
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Search, Eye, AlertCircle } from 'lucide-react';

interface PartnerInsights {
  total_pages: number;
  avg_seo_score: number;
  avg_position: number;
  avg_ctr: number;
  total_impressions: number;
  growth_trend: string;
}

interface PartnerAnalytics {
  total_visits: number;
  total_page_views: number;
  avg_session_duration: number;
  bounce_rate: number;
  pages_per_session: number;
  traffic_sources: {
    organic: number;
    direct: number;
    referral: number;
    social: number;
  };
}

interface PartnerSEO {
  total_pages: number;
  avg_seo_score: number;
  avg_position: number;
  ranking_distribution: {
    '1-10': number;
    '11-20': number;
    '21-50': number;
    '51-100': number;
    '100+': number;
  };
}

export default function PartnerPortalClient() {
  const [insights, setInsights] = useState<PartnerInsights | null>(null);
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [seo, setSeo] = useState<PartnerSEO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [localeId, setLocaleId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [timeframe, brandId, localeId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ timeframe });
      if (brandId) params.set('brand_id', brandId);
      if (localeId) params.set('locale', localeId);

      // Load insights, analytics, and SEO in parallel
      const [insightsRes, analyticsRes, seoRes] = await Promise.all([
        fetch(`/api/federation/insights?${params}`).catch(() => null),
        fetch(`/api/federation/analytics?${params}`).catch(() => null),
        fetch(`/api/federation/seo?${params}`).catch(() => null),
      ]);

      if (insightsRes?.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights);
      }

      if (analyticsRes?.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.analytics);
      }

      if (seoRes?.ok) {
        const seoData = await seoRes.json();
        setSeo(seoData.seo);
      }

      // Check for errors
      if (insightsRes && !insightsRes.ok) {
        const errorData = await insightsRes.json().catch(() => ({}));
        if (errorData.error) {
          setError(errorData.error);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="text-green-600" size={16} />;
      case 'falling':
        return <TrendingDown className="text-red-600" size={16} />;
      default:
        return <BarChart3 className="text-gray-400" size={16} />;
    }
  };

  if (loading && !insights && !analytics && !seo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partner insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Partner Portal
            </h1>
            <p className="text-gray-600 mt-2">
              Read-only insights and performance summaries
            </p>
          </div>
        </div>

        {/* PHASE 9A: Read-only warning */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-medium text-blue-900">⚠️ Read-Only Portal</p>
              <p className="text-sm text-blue-700 mt-1">
                This portal provides informational insights only. No content access, no edit, no publish, no approve.
                All data is aggregated and anonymized for partner viewing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Timeframe:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Growth Insights */}
      {insights && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Growth Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Pages</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(insights.total_pages)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg SEO Score</div>
              <div className="text-2xl font-bold text-green-600">
                {insights.avg_seo_score}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Position</div>
              <div className="text-2xl font-bold text-purple-600">
                {insights.avg_position}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg CTR</div>
              <div className="text-2xl font-bold text-indigo-600">
                {formatPercentage(insights.avg_ctr)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Impressions</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(insights.total_impressions)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Growth Trend</div>
              <div className="flex items-center gap-2">
                {getTrendIcon(insights.growth_trend)}
                <span className="text-lg font-semibold text-gray-900 capitalize">
                  {insights.growth_trend}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Insights */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Analytics Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Visits</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(analytics.total_visits)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Page Views</div>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(analytics.total_page_views)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Session Duration</div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(analytics.avg_session_duration)}s
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Bounce Rate</div>
              <div className="text-2xl font-bold text-red-600">
                {formatPercentage(analytics.bounce_rate)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Pages per Session</div>
              <div className="text-2xl font-bold text-indigo-600">
                {analytics.pages_per_session.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Traffic Sources */}
          {analytics.traffic_sources && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Traffic Sources</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Organic</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatNumber(analytics.traffic_sources.organic)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Direct</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatNumber(analytics.traffic_sources.direct)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Referral</div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatNumber(analytics.traffic_sources.referral)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Social</div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatNumber(analytics.traffic_sources.social)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEO Summary */}
      {seo && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="text-purple-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">SEO Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Pages</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(seo.total_pages)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg SEO Score</div>
              <div className="text-2xl font-bold text-green-600">
                {seo.avg_seo_score}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Position</div>
              <div className="text-2xl font-bold text-purple-600">
                {seo.avg_position}
              </div>
            </div>
          </div>

          {/* Ranking Distribution */}
          {seo.ranking_distribution && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ranking Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(seo.ranking_distribution).map(([range, count]) => (
                  <div key={range} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Position {range}</div>
                    <div className="text-xl font-bold text-indigo-600">
                      {formatNumber(count)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Note */}
      <div className="bg-gray-50 rounded-lg border p-4 text-center text-sm text-gray-600">
        <p>
          All data is read-only and aggregated. No content access, no edit, no publish, no approve.
        </p>
      </div>
    </div>
  );
}
