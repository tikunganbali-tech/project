/**
 * FASE 5 — CTA Insight Component
 * 
 * Displays basic CTA statistics: views, clicks, etc.
 */

'use client';

import { useEffect, useState } from 'react';

interface CtaStats {
  period: {
    days: number;
    since: string;
  };
  views: {
    total: number;
  };
  cta: {
    totalClicks: number;
    clicksByCta: Array<{ ctaId: string; count: number }>;
    clicksByPage: Array<{ pageType: string; count: number }>;
    ctas: Array<{
      id: string;
      label: string;
      type: string;
      enabled: boolean;
      clickCount: number;
    }>;
  };
}

export default function CtaInsight() {
  const [stats, setStats] = useState<CtaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cta/stats?days=7');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching CTA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">CTA Performance</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">CTA Performance (7 hari)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.views.total}</div>
          <div className="text-sm text-gray-500 mt-1">Total Views</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.cta.totalClicks}</div>
          <div className="text-sm text-gray-500 mt-1">Total CTA Clicks</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.views.total > 0
              ? ((stats.cta.totalClicks / stats.views.total) * 100).toFixed(1)
              : '0.0'}
            %
          </div>
          <div className="text-sm text-gray-500 mt-1">Click Rate</div>
        </div>
      </div>

      {stats.cta.ctas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">CTA Breakdown</h3>
          <div className="space-y-2">
            {stats.cta.ctas.map((cta) => (
              <div
                key={cta.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{cta.label}</div>
                  <div className="text-xs text-gray-500">
                    {cta.type} • {cta.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">{cta.clickCount}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
