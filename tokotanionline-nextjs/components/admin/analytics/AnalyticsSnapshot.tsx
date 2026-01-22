/**
 * Analytics Snapshot Component
 * E2.6: HARD ISOLATION - Only fetch snapshot, NO engine dependency
 */

'use client';

import { useEffect, useState } from 'react';

interface SnapshotData {
  totalVisits: number;
  uniqueVisitors: number;
  generatedAt: string | null;
}

export default function AnalyticsSnapshot() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // E2.6: Only fetch snapshot, NO engine calls
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((snapshot) => {
        setData(snapshot);
        setLoading(false);
      })
      .catch((error) => {
        console.warn('Failed to load snapshot:', error);
        setData({
          totalVisits: 0,
          uniqueVisitors: 0,
          generatedAt: null,
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">Loading snapshot...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Snapshot data - Engine runs in background</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Visits</div>
          <div className="text-3xl font-bold text-gray-900">{data?.totalVisits || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Unique Visitors</div>
          <div className="text-3xl font-bold text-gray-900">{data?.uniqueVisitors || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Last Updated</div>
          <div className="text-sm text-gray-900">
            {data?.generatedAt
              ? new Date(data.generatedAt).toLocaleString()
              : 'Not available'}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          📊 Analytics engine berjalan di background. Data akan diperbarui secara berkala.
        </p>
      </div>
    </div>
  );
}





