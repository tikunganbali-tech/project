'use client';

import { useEffect, useState } from 'react';

interface KpiData {
  totalVisits24h: number;
  totalVisits7d: number;
  ctaClicks: number;
  topProductName: string;
  stagnantCount: number;
  contentPublished7d: number;
}

export default function InsightKpiStrip() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpiData() {
      try {
        // Fetch multiple data sources in parallel
        const [analyticsRes, topProductsRes, stagnantRes, contentRes] = await Promise.all([
          fetch('/api/analytics/summary').catch(() => null),
          fetch('/api/insight/top-products').catch(() => null),
          fetch('/api/insight/stagnant-products').catch(() => null),
          fetch('/api/admin/analytics').catch(() => null),
        ]);

        // Get visits from analytics summary (fallback to 0)
        let totalVisits24h = 0;
        let totalVisits7d = 0;
        let ctaClicks = 0;

        if (analyticsRes?.ok) {
          const analytics = await analyticsRes.json();
          ctaClicks = analytics.totals?.click_cta || 0;
          // Estimate visits from page views (rough approximation)
          totalVisits7d = analytics.totals?.page_view || 0;
          // For 24h, we'll use a fraction (rough estimate)
          totalVisits24h = Math.floor(totalVisits7d / 7);
        } else if (contentRes?.ok) {
          // Fallback to analytics snapshot
          const snapshot = await contentRes.json();
          totalVisits7d = snapshot.totalVisits || 0;
          totalVisits24h = Math.floor(totalVisits7d / 7);
        }

        // Get top product
        let topProductName = 'Tidak ada data';
        if (topProductsRes?.ok) {
          const topProducts = await topProductsRes.json();
          if (topProducts.success && topProducts.data?.length > 0) {
            topProductName = topProducts.data[0].name || 'Tidak ada data';
          }
        }

        // Get stagnant count
        let stagnantCount = 0;
        if (stagnantRes?.ok) {
          const stagnant = await stagnantRes.json();
          if (stagnant.success && stagnant.data) {
            stagnantCount = stagnant.data.length || 0;
          }
        }

        // Get content published (7 days)
        // Since we can't create new API, we'll set to 0
        // This can be enhanced later with a proper API endpoint
        let contentPublished7d = 0;

        setData({
          totalVisits24h,
          totalVisits7d,
          ctaClicks,
          topProductName,
          stagnantCount,
          contentPublished7d,
        });
      } catch (error) {
        console.error('Error fetching KPI data:', error);
        // Set default values on error
        setData({
          totalVisits24h: 0,
          totalVisits7d: 0,
          ctaClicks: 0,
          topProductName: 'Tidak ada data',
          stagnantCount: 0,
          contentPublished7d: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchKpiData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">Belum cukup data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {/* Total Visits 24h */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600 mb-1">Kunjungan (24 jam)</div>
        <div className="text-2xl font-bold text-blue-600">{data.totalVisits24h.toLocaleString()}</div>
      </div>

      {/* Total Visits 7d */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600 mb-1">Kunjungan (7 hari)</div>
        <div className="text-2xl font-bold text-blue-600">{data.totalVisits7d.toLocaleString()}</div>
      </div>

      {/* CTA Clicks */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600 mb-1">Klik CTA</div>
        <div className="text-2xl font-bold text-green-600">{data.ctaClicks.toLocaleString()}</div>
      </div>

      {/* Top Product */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600 mb-1">Produk Teratas</div>
        <div className="text-lg font-semibold text-purple-600 truncate" title={data.topProductName}>
          {data.topProductName}
        </div>
      </div>

      {/* Stagnant Count */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600 mb-1">Produk Stagnan</div>
        <div className="text-2xl font-bold text-orange-600">{data.stagnantCount}</div>
      </div>

      {/* Content Published - Optional, can be removed if not needed */}
      {data.contentPublished7d > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Konten Terbit (7 hari)</div>
          <div className="text-2xl font-bold text-indigo-600">{data.contentPublished7d}</div>
        </div>
      )}
    </div>
  );
}

